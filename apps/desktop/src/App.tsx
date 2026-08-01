import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type HostState = "starting" | "ready" | "unhealthy" | "fatal";
type HostStatus = { state: HostState; message: string; origin?: string; database?: string; uptimeMs?: number };
const origin = import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";

async function readStatus(): Promise<HostStatus> {
  try {
    const response = await fetch(`${origin}/ready`);
    const report = await response.json() as { status?: HostState; database?: string; uptimeMs?: number };
    const state = report.status ?? (response.ok ? "ready" : "unhealthy");
    return { state, message: state === "ready" ? "Local Server ready for local operation" : state === "fatal" ? "Local Server failed to start" : "Local Server is unavailable", origin, database: report.database, uptimeMs: report.uptimeMs };
  } catch { return { state: "unhealthy", message: "Local Server is unavailable", origin }; }
}

export default function App() {
  const [status, setStatus] = useState<HostStatus>({ state: "starting", message: "Checking Local Server…" });
  const [busy, setBusy] = useState(false);
  const check = useCallback(async () => { setBusy(true); setStatus(await readStatus()); setBusy(false); }, []);
  useEffect(() => { void check(); const timer = window.setInterval(() => void check(), 5000); return () => window.clearInterval(timer); }, [check]);
  async function stop() { setBusy(true); await invoke("stop_host"); await check(); }
  return <main className="host-shell"><header><p className="eyebrow">KIDDY LAND / DESKTOP HOST</p><h1>Local operation center</h1><p className="subhead">One venue host. One authoritative Local Server. No Internet required.</p></header><section className="status-card"><div className="status-copy"><span className={`status-dot ${status.state}`} /><div><h2>{status.message}</h2><p>{status.state === "ready" ? "The host can accept local client connections." : "Mutations remain unavailable until readiness is confirmed."}</p></div></div><strong className={`pill ${status.state}`}>{status.state}</strong></section><section className="facts"><div><b>Local first</b><span>Data stays on this venue host.</span></div><div><b>Authoritative</b><span>Clients read readiness before writes.</span></div><div><b>Server origin</b><span>{status.origin ?? origin}</span></div></section><div className="actions"><button onClick={() => void check()} disabled={busy}>{busy ? "Checking…" : "Check again"}</button><button className="quiet" onClick={() => void stop()} disabled={busy}>Stop Local Server</button></div><footer>Database: {status.database ?? "unknown"}</footer></main>;
}
