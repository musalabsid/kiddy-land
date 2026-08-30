/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
/* Hallmark · macrostructure: Workbench · theme: Lumen · nav: N5 · footer: Ft5 · genre: editorial */
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { useHostStatus, type HostState, type HostStatusSource } from "@workspace/ui/lib/host";
import { useLiveReport } from "@kiddy-land/client/react";
import { useLocale, type MessageKey } from "@workspace/ui/lib/i18n";
import { cn } from "@workspace/ui/lib/utils";
import { AlertTriangle, CheckCircle2, LoaderCircle, PlugZap, RefreshCw, Server, Users, Wallet, WifiOff } from "lucide-react";

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
        {lanIpChanged && <Alert variant="destructive" className="border-[var(--state-warning)]/40 bg-[var(--state-warning-bg)]/30 text-[var(--state-warning)]"><AlertTriangle className="size-4" /><AlertTitle>{t("host.ipChangedTitle") ?? "Host IP changed"}</AlertTitle><AlertDescription className="flex flex-wrap items-center gap-2">{`Was ${lanIpChanged.old} → now ${lanIpChanged.cur}. ${t("host.ipChangedDesc")}`} <Button size="sm" variant="outline" onClick={()=>setLanIpChanged(null)}>{t("common.dismiss") ?? "Dismiss"}</Button> <Button size="sm" variant="outline" onClick={()=>check()}><RefreshCw className="size-3" /> {t("common.refresh") ?? "Refresh"}</Button></AlertDescription></Alert>}
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
function LiveCard({icon:Icon,label,value,loading,sub,tone}:{icon:any,label:string,value:number,loading:boolean,sub:string,tone?:"default"|"destructive"}){ return <Card className={tone==="destructive"?"border-destructive/30":""}><CardContent className="flex items-center gap-4 p-4"><div className={tone==="destructive"?"flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive":"flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"}><Icon className="size-5" /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p>{loading ? <Skeleton className="mt-1 h-7 w-12" /> : <p className="text-3xl font-bold tracking-tight">{value}</p>}<p className="text-xs text-muted-foreground">{sub}</p></div></CardContent></Card>; }
