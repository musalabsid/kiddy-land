import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleDot, LoaderCircle, RefreshCw, Server, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { fetchHostStatus, type HostStatus } from "#/lib/host";

export const Route = createFileRoute("/")({ component: HostDashboard });

const initialStatus: HostStatus = { state: "starting", message: "Checking Local Server…" };

function HostDashboard() {
  const [status, setStatus] = useState<HostStatus>(initialStatus);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setStatus(await fetchHostStatus());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 5_000);
    return () => window.clearInterval(timer);
  }, [check]);

  const ready = status.state === "ready";
  const fatal = status.state === "fatal";

  return (
    <main className="min-h-dvh bg-slate-950 px-5 py-8 text-slate-100 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Kiddy Land / Host</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Local operation center</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">One venue host. One authoritative Local Server. No Internet required.</p>
          </div>
          <Button variant="outline" onClick={() => void check()} disabled={checking} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
            <RefreshCw className={checking ? "animate-spin" : ""} data-icon="inline-start" /> Check again
          </Button>
        </header>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center gap-3"><Server className="text-cyan-300" /><div><CardTitle>Host readiness</CardTitle><CardDescription className="text-slate-400">Safe diagnostic state for venue staff</CardDescription></div></div>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-4">
              <StatusIcon state={status.state} />
              <div><p className="text-xl font-medium">{status.message}</p><p className="mt-1 text-sm text-slate-400">{ready ? "The host can accept local client connections." : fatal ? "Restart the host or contact an administrator." : "Mutations remain unavailable until readiness is confirmed."}</p></div>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${ready ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}><CircleDot className="size-3" /> {status.state}</span>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3">
          <InfoCard icon={<ShieldCheck />} title="Local first" text="Operational data stays on the venue host." />
          <InfoCard icon={<WifiOff />} title="Offline ready" text="Internet loss does not queue transactions." />
          <InfoCard icon={<CheckCircle2 />} title="Authoritative" text="Every client reads server readiness first." />
        </section>

        <footer className="text-xs text-slate-500">{status.origin ? `Server origin: ${status.origin}` : "Server origin unavailable"}{status.database ? ` · Database: ${status.database}` : ""}</footer>
      </div>
    </main>
  );
}

function StatusIcon({ state }: { state: HostStatus["state"] }) {
  if (state === "ready") return <CheckCircle2 className="mt-1 size-8 shrink-0 text-emerald-400" />;
  if (state === "fatal") return <AlertTriangle className="mt-1 size-8 shrink-0 text-rose-400" />;
  if (state === "unhealthy") return <WifiOff className="mt-1 size-8 shrink-0 text-amber-300" />;
  return <LoaderCircle className="mt-1 size-8 shrink-0 animate-spin text-cyan-300" />;
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <Card className="border-slate-800 bg-slate-900 text-slate-100"><CardContent className="flex gap-3 pt-6"><span className="text-cyan-300">{icon}</span><div><h2 className="font-medium">{title}</h2><p className="mt-1 text-sm text-slate-400">{text}</p></div></CardContent></Card>;
}
