import * as React from "react";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { useTicketScan, useTicketRecovery, useCollectCharge, useSession } from "@kiddy-land/client/react";
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
const recoverySchema = z.object({ childId: z.string().trim().min(1, "Child ID is required") });

export function TicketScanner({ kind, enableCamera = false }: { kind: "entry" | "exit"; enableCamera?: boolean }) {
  const { t } = useLocale(); const { session } = useSession(); const scan = useTicketScan(kind); const recovery = useTicketRecovery(); const collect = useCollectCharge(); const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "QRIS" | "bank-transfer">("cash");
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<ScanValues>({ resolver: zodResolver(scanSchema), defaultValues: { code: "" } });
  const recoveryForm = useForm<{ childId: string }>({ resolver: zodResolver(recoverySchema), defaultValues: { childId: "" } });
  const submit = handleSubmit((values) => { scan.mutate(values.code); });
  const result = scan.data;
  const submitRecovery = recoveryForm.handleSubmit((values) => { recovery.mutate({ code: getValues("code") || result?.ticket?.code || "", childId: values.childId }); recoveryForm.reset(); });
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><ScanLine />{kind === "entry" ? t("scanner.entryTitle") : t("scanner.exitTitle")}</CardTitle><CardDescription>{t("scanner.description")}</CardDescription></CardHeader><CardContent className="grid gap-4">{enableCamera && <BarcodeScanner onDetect={(value) => { setValue("code", value); scan.mutate(value); }} />}<form className="flex gap-2" onSubmit={submit} noValidate><FormField label={t("scanner.placeholder")} required htmlFor="scanner-code" error={errors.code?.message} className="flex-1 gap-1.5"><input autoFocus id="scanner-code" className="h-10 min-w-0 w-full border border-input bg-background px-3 font-mono text-sm" placeholder={t("scanner.placeholder")} aria-invalid={errors.code ? true : undefined} {...register("code")} /></FormField><Button type="submit" disabled={scan.isPending} className="self-end">{t("scanner.scan")}</Button></form>{result && <Alert variant={result.ok ? "default" : "destructive"}>{result.ok ? <CheckCircle2 /> : <XCircle />}<AlertTitle>{result.message}</AlertTitle><AlertDescription>{result.session && `${t("scanner.status")}: ${result.session.status} · ${t("scanner.overtime")}: ${result.session.overtimeMinutes} · ${t("scanner.outstanding")}: ${result.session.outstandingCharge}`}</AlertDescription></Alert>}{scan.error && <Alert variant="destructive"><XCircle /><AlertTitle>{t("scanner.error")}</AlertTitle><AlertDescription>{scan.error.message}</AlertDescription></Alert>}{kind === "entry" && <div className="grid gap-2 border-t pt-4"><p className="text-sm font-medium">{t("scanner.recovery")}</p><form className="flex gap-2" onSubmit={submitRecovery} noValidate><FormField label={t("scanner.childId")} required htmlFor="scanner-child-id" error={recoveryForm.formState.errors.childId?.message} className="flex-1 gap-1.5"><input id="scanner-child-id" className="h-10 min-w-0 w-full border border-input bg-background px-3 text-sm" placeholder={t("scanner.childId")} aria-invalid={recoveryForm.formState.errors.childId ? true : undefined} {...recoveryForm.register("childId")} /></FormField><Button variant="outline" type="submit" disabled={recovery.isPending || !result?.ticket?.code} className="self-end">{t("scanner.recover")}</Button></form>{recovery.data && <p className="font-mono text-xs text-primary">{recovery.data.code}</p>}</div>}{kind === "exit" && result?.session && result.session.outstandingCharge > 0 && <div className="grid gap-2 border-t pt-4"><p className="text-sm font-medium">{t("scanner.collectCharge")}: {result.session.outstandingCharge}</p><div className="flex gap-2"><Select className="h-10" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}><option value="cash">{t("sale.cash")}</option><option value="QRIS">QRIS</option><option value="bank-transfer">{t("sale.bankTransfer")}</option></Select><Button onClick={() => result.ticket && collect.mutate({ ticketId: result.ticket.id, amount: result.session!.outstandingCharge, paymentMethod })} disabled={collect.isPending}>{t("scanner.collect")}</Button></div></div>}<p className="text-xs text-muted-foreground">{session?.device.mode} · {t("scanner.serverAuthority")}</p></CardContent></Card>;
}
