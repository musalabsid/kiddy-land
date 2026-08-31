import * as React from "react";
import { CheckCircle2, LogIn, LogOut, X, XCircle } from "lucide-react";
import { useTicketScan, useCollectCharge, useRefundDeposit, useSession } from "@kiddy-land/client/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { BarcodeScanner } from "@workspace/ui/components/barcode-scanner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { Select } from "@workspace/ui/components/select";

const scanSchema = z.object({ code: z.string().trim().min(1, "Ticket code is required") });
type ScanValues = z.infer<typeof scanSchema>;

export function TicketScanner({ kind, enableCamera = false }: { kind: "entry" | "exit"; enableCamera?: boolean }) {
  const { t, locale } = useLocale(); const { session } = useSession(); const scan = useTicketScan(kind); const collect = useCollectCharge(); const refund = useRefundDeposit(); const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "QRIS" | "bank-transfer">("cash");
  const { register, handleSubmit, watch, formState: { errors }, clearErrors } = useForm<ScanValues>({ resolver: zodResolver(scanSchema), defaultValues: { code: "" }, mode: "onSubmit", reValidateMode: "onSubmit" });
  const codeValue = watch("code");
  const submit = handleSubmit((values) => { scan.mutate(values.code); });
  const result = scan.data;
  return <Card><CardHeader><CardTitle className="flex items-center gap-2">{kind === "entry" ? <LogIn /> : <LogOut />}{kind === "entry" ? t("scanner.entryTitle") : t("scanner.exitTitle")}</CardTitle><CardDescription>{t("scanner.description")}</CardDescription></CardHeader><CardContent className="grid gap-4">{enableCamera && <BarcodeScanner onDetect={(value) => scan.mutate(value)} />}<form className="flex gap-2" onSubmit={submit} noValidate><FormField label={t("scanner.placeholder")} required htmlFor="scanner-code" error={errors.code?.message} className="flex-1 gap-1.5"><input autoFocus id="scanner-code" className="h-10 min-w-0 w-full border border-input bg-background px-3 font-mono text-sm" placeholder={t("scanner.placeholder")} aria-invalid={errors.code ? true : undefined} {...register("code", { onBlur: () => clearErrors("code") })} /></FormField><Button type="submit" disabled={scan.isPending || !codeValue?.trim()} className="self-end">{t("scanner.scan")}</Button></form>{result && <Alert variant={result.ok ? "default" : "destructive"} className="relative pr-8">{result.ok ? <CheckCircle2 /> : <XCircle />}<AlertTitle>{result.message}</AlertTitle><AlertDescription>{result.session && <ul className="grid gap-1 text-sm">
                      <li><span className="font-medium">{t("scanner.status")}:</span> {result.session!.status}</li>
                      <li><span className="font-medium">{t("scanner.overtime")}:</span> {result.session!.overtimeMinutes}m</li>
                      {(()=>{const dep=result.ticket?.package.deposit ?? 0; const applied=result.session!.depositApplied ?? 0; const refunded=result.session!.depositRefunded ?? 0; const toReturn=Math.max(0, dep - applied - refunded); const fmt=(n:number)=>new Intl.NumberFormat(locale==="id"?"id-ID":"en-US",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n); return (<><li><span className="font-medium">{kind === "entry" ? t("scanner.depositHeld") : t("scanner.depositReturn")}:</span> {fmt(toReturn)}{refunded ? ` (${t("scanner.refunded")}: ${fmt(refunded)})` : ""}</li></>);})()}
                    </ul>}
                  </AlertDescription><button type="button" onClick={() => scan.reset()} className="absolute right-2 top-2 rounded p-1 hover:bg-muted"><X className="size-4" /></button></Alert>}{scan.error && <Alert variant="destructive"><XCircle /><AlertTitle>{t("scanner.error")}</AlertTitle><AlertDescription>{scan.error.message}</AlertDescription></Alert>}{kind === "exit" && result?.session && result.session.outstandingCharge > 0 && <div className="grid gap-2 border-t pt-4"><p className="text-sm font-medium">{t("scanner.collectCharge")}: {result.session.outstandingCharge}</p><div className="flex gap-2"><Select className="h-10" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}><option value="cash">{t("sale.cash")}</option><option value="QRIS">QRIS</option><option value="bank-transfer">{t("sale.bankTransfer")}</option></Select><Button onClick={() => result.ticket && collect.mutate({ ticketId: result.ticket.id, amount: result.session!.outstandingCharge, paymentMethod })} disabled={collect.isPending}>{t("scanner.collect")}</Button></div></div>}{kind === "exit" && result?.ticket && result?.session && (()=>{const dep=result.ticket.package.deposit; const applied=result.session.depositApplied ?? 0; const refunded=result.session.depositRefunded ?? 0; const toReturn=Math.max(0, dep-applied-refunded); if(toReturn<=0) return null; return <div className="grid gap-2 border-t pt-4"><p className="text-sm font-medium">{t("scanner.depositReturn")}: {new Intl.NumberFormat(locale==="id"?"id-ID":"en-US",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(toReturn)}</p><Button variant="outline" onClick={()=> { if(!result.ticket) return; refund.mutate(result.ticket.id, { onSuccess: ()=> toast.success(t("scanner.refunded"))}); }} disabled={refund.isPending}>{t("scanner.refundDeposit") ?? "Refund deposit"}</Button></div>;})()}<p className="text-xs text-muted-foreground">{session?.device.mode} · {t("scanner.serverAuthority")}</p></CardContent></Card>;
}
