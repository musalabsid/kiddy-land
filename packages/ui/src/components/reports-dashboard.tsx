import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReport, reportExportUrl } from "@kiddy-land/client/react";
import { useClient } from "@kiddy-land/client/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useLocale } from "@workspace/ui/lib/i18n";
import { FormField } from "@workspace/ui/components/form-field";
import { CalendarDays, Download, Users, Package, AlertTriangle, Wallet } from "lucide-react";

const reportFilterSchema = z.object({ from: z.string().min(1, "Start date is required"), to: z.string().min(1, "End date is required") }).refine((value) => value.from <= value.to, { message: "End date must be on or after start date", path: ["to"] });
type ReportFilterValues = z.infer<typeof reportFilterSchema>;

type FinancialData = { totals: { ticketRevenue: number; productRevenue: number; overtimeRevenue: number; grossRevenue: number; netRevenue: number; deposits: { received: number; applied: number; refunded: number; forfeited: number; held: number }; refunds: number; voids: number; correctionNet: number; priceOverrides: unknown[]; paymentMethods: Record<string,number>; cashiers: Record<string,number> } };
const KINDS = [
  { id: "financial" as const, labelKey: "reports.financial" as const },
  { id: "playground" as const, labelKey: "reports.playground" as const },
  { id: "inventory" as const, labelKey: "reports.inventory" as const },
  { id: "membership" as const, labelKey: "reports.membership" as const },
];

function fmtIDR(n:number, locale:string){ return new Intl.NumberFormat(locale==="id"?"id-ID":"en-US",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n); }

export function ReportsDashboard() {
  const { t, locale } = useLocale();
  const client = useClient();
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const [kind, setKind] = React.useState<"financial"|"playground"|"inventory"|"membership">("financial");
  const [cashierId, setCashierId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [packageId, setPackageId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [memberId, setMemberId] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const { handleSubmit, setValue, formState: { errors } } = useForm<ReportFilterValues>({ resolver: zodResolver(reportFilterSchema), defaultValues: { from: today, to: today } });
  const filters = { from, to, cashierId: cashierId||undefined, paymentMethod: paymentMethod||undefined, packageId: packageId||undefined, productId: productId||undefined, memberId: memberId||undefined };
  const financial = useReport<{data: FinancialData["totals"] extends never ? any : { totals: FinancialData["totals"]}}>("financial", filters) as any;
  const report = useReport<any>(kind, filters);
  const updateDate = (field:"from"|"to", value:string)=>{ if(field==="from") setFrom(value); else setTo(value); setValue(field, value, {shouldValidate:true}); };
  const download = async (format:"csv"|"pdf")=>{ const valid=reportFilterSchema.safeParse({from,to}); if(!valid.success) return; const blob=await client.download(reportExportUrl("", kind, filters, format)); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=kind+"-report."+format; a.click(); URL.revokeObjectURL(a.href); };
  const submitDownload=(format:"csv"|"pdf")=>{ void handleSubmit(()=>download(format))(); };
  const isLoading = report.isLoading || financial.isLoading;
  const isError = (report as any).isError || (financial as any).isError;
  return <div className="w-full max-w-6xl px-5 py-8 sm:px-8"><header className="flex flex-wrap items-end justify-between gap-4 mb-4">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("reports.eyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("reports.subtitle")}</p></div>
      <div className="flex items-center gap-2"><Button variant="outline" onClick={()=>submitDownload("csv")}><Download data-icon="inline-start" />CSV</Button><Button onClick={()=>submitDownload("pdf")}><Download data-icon="inline-start" />PDF</Button></div>
    </header>
    <section className="grid gap-4"><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-5 text-foreground" />{t("reports.dateRange")}</CardTitle><CardDescription>{t("reports.exportsHint")}</CardDescription></CardHeader><CardContent className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
        <FormField label={t("reports.fromDate")} required htmlFor="report-from" error={errors.from?.message}><input id="report-from" className="h-10 w-full border border-input bg-background px-3 text-sm" type="date" value={from} onChange={(e)=>updateDate("from", e.target.value)} aria-invalid={errors.from?true:undefined} /></FormField>
        <FormField label={t("reports.toDate")} required htmlFor="report-to" error={errors.to?.message}><input id="report-to" className="h-10 w-full border border-input bg-background px-3 text-sm" type="date" value={to} onChange={(e)=>updateDate("to", e.target.value)} aria-invalid={errors.to?true:undefined} /></FormField>
      </div>
      <div><Button variant="ghost" size="sm" onClick={()=>setShowFilters(v=>!v)} className="h-7 px-2 text-xs">{showFilters?t("reports.hideFilters"):t("reports.advancedFilters")}</Button>{showFilters&&<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="grid gap-1 text-sm"><span className="text-xs font-medium">{t("reports.cashierId")}</span><input className="h-9 border border-input bg-background px-3" placeholder="optional" value={cashierId} onChange={e=>setCashierId(e.target.value)} /></label><label className="grid gap-1 text-sm"><span className="text-xs font-medium">{t("reports.paymentMethod")}</span><select className="h-9 border border-input bg-background px-3" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="">{t("reports.any")}</option><option value="cash">Cash</option><option value="QRIS">QRIS</option><option value="bank-transfer">Bank transfer</option></select></label><label className="grid gap-1 text-sm"><span className="text-xs font-medium">{t("reports.packageId")}</span><input className="h-9 border border-input bg-background px-3" placeholder="optional" value={packageId} onChange={e=>setPackageId(e.target.value)} /></label><label className="grid gap-1 text-sm"><span className="text-xs font-medium">{t("reports.productId")}</span><input className="h-9 border border-input bg-background px-3" placeholder="optional" value={productId} onChange={e=>setProductId(e.target.value)} /></label><label className="grid gap-1 text-sm"><span className="text-xs font-medium">{t("reports.memberId")}</span><input className="h-9 border border-input bg-background px-3" placeholder="optional" value={memberId} onChange={e=>setMemberId(e.target.value)} /></label></div>}</div>
    </CardContent></Card>

    <div role="tablist" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit">
      {KINDS.map(k=> <button key={k.id} role="tab" aria-selected={kind===k.id} onClick={()=>setKind(k.id)} className={kind===k.id?"bg-background shadow-sm text-foreground rounded-md px-4 py-2 text-sm font-medium":"text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm"}>{t(k.labelKey)}</button>)}
    </div>

    {isLoading ? <div className="grid gap-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div> : isError ? <Alert variant="destructive"><AlertTitle>{t("reports.couldNotLoad")}</AlertTitle><AlertDescription>{t("reports.checkDates")}</AlertDescription></Alert> : kind==="financial" ? <FinancialView data={financial.data as any} locale={locale} /> : kind==="playground" ? <PlaygroundView data={report.data as any} /> : kind==="inventory" ? <InventoryView data={report.data as any} /> : <MembershipView data={report.data as any} />}

    {report.data && <p className="text-xs text-muted-foreground">{t("reports.generated")} {(report.data as any)?.generatedAt ? new Date((report.data as any).generatedAt).toLocaleString(locale) : ""} · {(report.data as any)?.timezone ?? ""} · {(report.data as any)?.filters?.from} → {(report.data as any)?.filters?.to}</p>}
  </section></div>;
}

function FinancialView({data, locale}:{data:any, locale:string}){
  const { t } = useLocale();
  const vals=data?.data?.totals; if(!vals) return <Card><CardContent className="p-8 text-center text-base text-muted-foreground">{t("reports.noSales")}</CardContent></Card>;
  return <div className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label={t("reports.grossRevenue")} value={fmtIDR(vals.grossRevenue, locale)} sub="tickets + products + overtime" />
      <Stat label={t("reports.netRevenue")} value={fmtIDR(vals.netRevenue, locale)} sub="gross − refunds + corrections" accent />
      <Stat label={t("reports.ticketRevenue")} value={fmtIDR(vals.ticketRevenue, locale)} />
      <Stat label={t("reports.productRevenue")} value={fmtIDR(vals.productRevenue, locale)} />
    </div>
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">{t("reports.breakdown")}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 text-sm"><Row label={t("reports.overtime")} value={fmtIDR(vals.overtimeRevenue, locale)} /><Row label={t("reports.refunds")} value={"-" + fmtIDR(vals.refunds, locale)} /><Row label={t("reports.voids")} value={String(vals.voids)} /><Row label={t("reports.correctionNet")} value={fmtIDR(vals.correctionNet, locale)} /><Row label={t("reports.priceOverrides")} value={String(vals.priceOverrides?.length ?? 0)} /></div>
      <div className="grid gap-2 text-sm"><Row label={t("reports.depositsReceived")} value={fmtIDR(vals.deposits?.received ?? vals.depositsReceived ?? 0, locale)} /><Row label={t("reports.depositsApplied")} value={fmtIDR(vals.deposits?.applied ?? 0, locale)} /><Row label={t("reports.depositsRefunded")} value={fmtIDR(vals.deposits?.refunded ?? 0, locale)} /><Row label={t("reports.depositsHeld")} value={fmtIDR(vals.deposits?.held ?? 0, locale)} /><Row label={t("reports.forfeited")} value={fmtIDR(vals.deposits?.forfeited ?? 0, locale)} /></div>
    </CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="size-4" />{t("reports.paymentMethods")}</CardTitle></CardHeader><CardContent>{Object.keys(vals.paymentMethods||{}).length ? <div className="grid gap-1 text-sm">{Object.entries(vals.paymentMethods).map(([k,v])=><Row key={k} label={k} value={fmtIDR(v as number, locale)} />)}</div> : <p className="text-sm text-muted-foreground">{t("reports.noPayments")}</p>}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="size-4" />{t("reports.cashiers")}</CardTitle></CardHeader><CardContent>{Object.keys(vals.cashiers||{}).length ? <div className="grid gap-1 text-sm">{Object.entries(vals.cashiers).map(([k,v])=><Row key={k} label={k.slice(0,8)} value={fmtIDR(v as number, locale)} />)}</div> : <p className="text-sm text-muted-foreground">{t("reports.noCashiers")}</p>}</CardContent></Card>
    </div>
  </div>;
}
function PlaygroundView({data}:{data:any}){
  const { t } = useLocale();
  const d=data?.data; if(!d || typeof d.occupancy==="undefined") return <Card><CardContent className="p-8 text-center text-base text-muted-foreground">{t("reports.noPlayground")}</CardContent></Card>;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <Stat label="Occupancy" value={String(d.occupancy)} sub="active now" />
    <Stat label="Entries" value={String(d.entries??0)} />
    <Stat label="Exits" value={String(d.exits??0)} />
    <Stat label="Auto-closed" value={String(d.autoClosed??0)} sub={d.overtimeMinutes? d.overtimeMinutes+" overtime min":""} />
  </div>;
}
function InventoryView({data}:{data:any}){
  const { t } = useLocale();
  const d=data?.data; if(!d) return <Card><CardContent className="p-8 text-center text-base text-muted-foreground">{t("reports.noInventory")}</CardContent></Card>;
  return <div className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-3"><Stat label="Products" value={String(d.products?.length??0)} /><Stat label="Low stock" value={String(d.lowStock?.length??0)} tone={d.lowStock?.length?"destructive":"default"} /><Stat label="Movements" value={String(d.movements?.length??0)} /></div>
    {d.lowStock?.length ? <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" />Low stock</CardTitle></CardHeader><CardContent><div className="grid gap-2 text-sm">{d.lowStock.slice(0,8).map((p:any)=><div key={p.id} className="flex items-center justify-between border px-3 py-2"><span className="truncate">{p.name} · {p.sku}</span><span className={p.stock<=p.lowStockThreshold?"text-destructive font-medium":""}>{p.stock} / {p.lowStockThreshold}</span></div>)}</div></CardContent></Card> : null}
    {d.products?.length ? <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="size-4" />Products</CardTitle></CardHeader><CardContent><div className="grid gap-1 text-sm max-h-64 overflow-auto">{d.products.slice(0,20).map((p:any)=><div key={p.id} className="flex justify-between gap-2 border-b py-1.5 last:border-0"><span className="truncate">{p.name}</span><span className="text-muted-foreground">{p.stock}</span></div>)}{d.products.length>20 && <p className="text-xs text-muted-foreground">+{d.products.length-20} more</p>}</div></CardContent></Card> : null}
  </div>;
}
function MembershipView({data}:{data:any}){
  const { t } = useLocale();
  const d=data?.data; if(!d) return <Card><CardContent className="p-8 text-center text-base text-muted-foreground">{t("reports.noMembership")}</CardContent></Card>;
  return <div className="grid gap-3 sm:grid-cols-3"><Stat label="Members" value={String(d.members?.length??0)} /><Stat label="Events" value={String(d.events?.length??0)} /><Stat label="Visits" value={String(d.visits?.length??0)} /></div>;
}
function Stat({label,value,sub,accent,tone}:{label:string,value:string,sub?:string,accent?:boolean,tone?:"default"|"destructive"}){ return <Card className={accent?"border-primary/30 bg-primary/[0.03]":tone==="destructive"?"border-destructive/30":""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={accent?"text-3xl font-bold tracking-tight text-primary":"text-3xl font-bold tracking-tight"}>{value}</p>{sub&&<p className="text-xs text-muted-foreground">{sub}</p>}</CardContent></Card>; }
function Row({label,value}:{label:string,value:string}){ return <div className="flex justify-between gap-2 border-b py-1.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>; }
