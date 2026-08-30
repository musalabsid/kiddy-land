/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
/* Hallmark · macrostructure: Workbench · theme: Lumen · nav: N5 · footer: Ft5 · genre: editorial */
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { useHostStatus, type HostState, type HostStatusSource } from "@workspace/ui/lib/host";
import { useLiveReport, useOverviewTickets } from "@kiddy-land/client";
import { useLocale, type MessageKey } from "@workspace/ui/lib/i18n";
import { cn } from "@workspace/ui/lib/utils";
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, PlugZap, RefreshCw, Server, Users, Wallet, WifiOff } from "lucide-react";

export function HostOverviewPage({
  source,
  origin,
  onStop,
  onStart,
}: {
  source: HostStatusSource;
  origin?: string;
  onStop?: () => Promise<void>;
  onStart?: () => Promise<void>;
}) {
  const { t } = useLocale();
  const { status, checking, check } = useHostStatus(source);
  const ready = status.state === "ready";
  const [stopOpen, setStopOpen] = React.useState(false);
  const [startOpen, setStartOpen] = React.useState(false);
  const prevLanIp = React.useRef<string | undefined>(undefined);
  const [lanIpChanged, setLanIpChanged] = React.useState<{old?:string, cur?:string}| null>(null);
  React.useEffect(()=>{
    const cur = (status as any).lanIp as string | undefined;
    if (prevLanIp.current && cur && prevLanIp.current !== cur) setLanIpChanged({old: prevLanIp.current, cur});
    if (cur) prevLanIp.current = cur;
    else if (status.state==="ready" && !cur) prevLanIp.current = undefined;
  }, [status]);
  const live = useLiveReport<{data: { occupancy: number; activeMembers: number; lowStock: number }}>();
  const titleKey: MessageKey =
    status.state === "ready"
      ? "host.ready"
      : status.state === "fatal"
        ? "host.fatal"
        : status.state === "starting"
          ? "host.starting"
          : "host.unhealthy";
  return (
    <main className="min-h-dvh bg-background text-foreground overflow-x-clip">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        {lanIpChanged && <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"><AlertTriangle className="size-4" /><AlertTitle>{t("host.ipChangedTitle") ?? "Host IP changed"}</AlertTitle><AlertDescription className="flex flex-wrap items-center gap-2">{`Was ${lanIpChanged.old} → now ${lanIpChanged.cur}. ${t("host.ipChangedDesc")}`} <Button size="sm" variant="outline" onClick={()=>setLanIpChanged(null)}>{t("common.dismiss") ?? "Dismiss"}</Button> <Button size="sm" variant="outline" onClick={()=>check()}><RefreshCw className="size-3" /> {t("common.refresh") ?? "Refresh"}</Button></AlertDescription></Alert>}
        <div className="grid gap-6">
          <div className="grid content-start gap-4">
            <div className="border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold tracking-tight">{t("host.readiness")}</h2>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground"><PlugZap className="size-3.5" />{t("host.database")}: {status.database ?? "—"}</span>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-3">
                  <div className="flex gap-3">
                    <StatusIcon state={status.state} />
                    <div>
                      <p className="text-lg font-semibold leading-none">{t(titleKey)}</p>
                      <p className="mt-1 max-w-[36ch] text-sm leading-6 text-muted-foreground">{ready ? t("host.readyDescription") : t("host.notReadyDescription")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void check()} disabled={checking}><RefreshCw className={cn("size-3.5", checking && "animate-spin")} />{t("host.check")}</Button>
                    {onStop && ready && <Button variant="destructive" size="sm" onClick={() => setStopOpen(true)}>{t("host.stop")}</Button>}
                    {onStart && !ready && <Button size="sm" onClick={() => setStartOpen(true)}>{t("host.start")}</Button>}
                  </div>
                </div>
                <div className="grid gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-5">
                  <p className="font-semibold text-foreground">{ready ? "Live on this host" : "Host paused"}</p>
                  <p className="text-muted-foreground">{ready ? "Cashier, scanner and kiosk are connected to this origin. No internet needed." : "Devices are offline. Start the host to reconnect cashier, scanner and kiosk on this LAN."}</p>
                  <p className="font-mono text-[11px] break-all">{status.origin ?? origin ?? t("host.stopUnavailable")}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <LiveCard icon={Users} label={t("reports.liveOccupancy")} value={live.data?.data.occupancy ?? 0} loading={live.isLoading} sub={t("reports.activeSessions")} />
              <LiveCard icon={Wallet} label={t("reports.activeMembers")} value={live.data?.data.activeMembers ?? 0} loading={live.isLoading} sub={t("reports.notDeactivated")} />
              <LiveCard icon={AlertTriangle} label={t("reports.lowStock")} value={live.data?.data.lowStock ?? 0} loading={live.isLoading} sub={t("reports.needsRestock")} tone={live.data && live.data.data.lowStock>0?"destructive":"default"} />
            </div>


          </div>
        </div>

        <div className="mt-6">
          <OverviewTicketsSection />
        </div>

        <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("host.stopConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("host.stopConfirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={async () => { console.log("[DEBUG-host] stop clicked"); setStopOpen(false); try { await onStop?.(); console.log("[DEBUG-host] stop invoke ok"); } catch(e){ console.log("[DEBUG-host] stop invoke failed", e); } setTimeout(() => void check(), 500); }}>{t("host.stop")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={startOpen} onOpenChange={setStartOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("host.startConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("host.startConfirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={async () => { console.log("[DEBUG-host] start clicked"); setStartOpen(false); try { await onStart?.(); console.log("[DEBUG-host] start invoke ok"); } catch(e){ console.log("[DEBUG-host] start invoke failed", e); } setTimeout(() => void check(), 800); }}>{t("host.start")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
function StatusIcon({ state, size }: { state: HostState; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-4" : "size-8 shrink-0";
  if (state === "ready") return <CheckCircle2 className={cn("mt-0.5", cls, "text-primary")} />;
  if (state === "fatal") return <AlertTriangle className={cn("mt-0.5", cls, "text-destructive")} />;
  if (state === "unhealthy") return <WifiOff className={cn("mt-0.5", cls, "text-muted-foreground")} />;
  return <LoaderCircle className={cn("mt-0.5 animate-spin", cls, "text-primary")} />;
}
function OverviewTicketsSection() {
  const { data, isLoading } = useOverviewTickets();
  const tickets = data?.tickets ?? [];
  if (isLoading) return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4" /> Today's Tickets</CardTitle></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;
  if (!tickets.length) return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-4" /> Today\'s Tickets</CardTitle><CardDescription>{data?.operatingDate ?? ""} — no tickets yet</CardDescription></CardHeader></Card>;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Clock3 className="size-4" /> Today's Tickets — {tickets.length}</CardTitle><CardDescription>{data?.operatingDate} — longest playing on top</CardDescription></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left">No</th><th className="px-3 py-2 text-left">Package</th><th className="px-3 py-2 text-left">Dur</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Played</th><th className="px-3 py-2 text-right">Left</th><th className="px-3 py-2 text-right">Overtime</th></tr></thead>
          <tbody>{tickets.map(t => <TicketRow key={t.ticketId} ticket={t} />)}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}
const TicketRow = React.memo(function TicketRow({ ticket }: { ticket: any }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (ticket.status !== "active" && ticket.sessionStatus !== "active") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticket.status, ticket.sessionStatus, ticket.enteredAt]);
  const remaining = ticket.enteredAt && ticket.duration != null ? Math.max(0, (ticket.duration * 60000 - (now - ticket.enteredAt)) / 60000) : ticket.remainingMinutes;
  const elapsed = ticket.enteredAt && ticket.sessionStatus === "active" ? Math.floor((now - ticket.enteredAt)/60000) : ticket.elapsedMinutes;
  const isActive = ticket.status === "active" || ticket.sessionStatus === "active";
  const fmt = (m:number|null)=> m==null? "—" : m<=0? "0m" : `${Math.floor(m)}m ${String(Math.floor((m%1)*60)).padStart(2,"0")}s`;
  const left = isActive && ticket.duration!=null ? fmt(remaining) : ticket.status==="waiting" ? `${ticket.duration ?? "∞"}m` : "—";
  const overtime = ticket.overtimeMinutes > 0 ? `${ticket.overtimeMinutes}m` : "—";
  const badgeVariant = ticket.status==="active" ? "default" : ticket.status==="waiting" ? "secondary" : ticket.status==="completed" ? "outline" : "destructive";
  return (
    <tr className={ticket.overtimeMinutes>0 ? "bg-destructive/5" : ""}>
      <td className="px-3 py-2 font-mono font-bold">{ticket.dailyNumber}</td>
      <td className="px-3 py-2">{ticket.packageName}</td>
      <td className="px-3 py-2">{ticket.duration==null? "∞" : `${ticket.duration}m`}</td>
      <td className="px-3 py-2"><span className={badgeVariant==="default"?"inline-flex rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground":badgeVariant==="secondary"?"inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px]":badgeVariant==="outline"?"inline-flex rounded-full border px-2 py-0.5 text-[11px]":"inline-flex rounded-full bg-destructive px-2 py-0.5 text-[11px] text-destructive-foreground"}>{ticket.status}</span>{isActive && ticket.sessionStatus? <span className="ml-1 text-xs text-muted-foreground">·{ticket.sessionStatus}</span>:null}</td>
      <td className="px-3 py-2 text-right font-mono">{elapsed}m</td>
      <td className={isActive && remaining!=null && remaining<=5 ? "px-3 py-2 text-right font-mono text-destructive font-semibold" : "px-3 py-2 text-right font-mono"}>{left}</td>
      <td className={ticket.overtimeMinutes>0 ? "px-3 py-2 text-right font-mono text-destructive" : "px-3 py-2 text-right font-mono"}>{overtime}</td>
    </tr>
  );
});
function LiveCard({icon:Icon,label,value,loading,sub,tone}:{icon:any,label:string,value:number,loading:boolean,sub:string,tone?:"default"|"destructive"}){ return <Card className={tone==="destructive"?"border-destructive/30":""}><CardContent className="flex items-center gap-4 p-4"><div className={tone==="destructive"?"flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive":"flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"}><Icon className="size-5" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p>{loading ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="text-3xl font-bold tracking-tight">{value}</p>}<p className="text-xs text-muted-foreground">{sub}</p></div></CardContent></Card>; }
