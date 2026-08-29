import { useCallback, useEffect, useState } from "react";

export type HostState = "starting" | "ready" | "unhealthy" | "fatal";
export type HostStatus = { state: HostState; message?: string; origin?: string; database?: "ready" | "unhealthy"; uptimeMs?: number; lanIp?: string; httpsUrl?: string };
export type HostStatusSource = { read: () => Promise<HostStatus> };

export function useHostStatus(source: HostStatusSource, intervalMs = 5_000) {
  const [status, setStatus] = useState<HostStatus>({ state: "starting" });
  const [checking, setChecking] = useState(false);
  const check = useCallback(async () => { setChecking(true); setStatus(await source.read()); setChecking(false); }, [source]);
  useEffect(() => { void check(); const timer = window.setInterval(() => void check(), intervalMs); return () => window.clearInterval(timer); }, [check, intervalMs]);
  return { status, checking, check };
}

export function createHttpHostSource(origin: string): HostStatusSource {
  return { read: async () => { try { const response = await fetch(`${origin}/ready`); const report = await response.json() as HostStatus & { status?: HostState; httpsUrl?: string; lanIp?: string }; return { ...report, origin, state: report.status ?? (response.ok ? "ready" : "unhealthy") }; } catch { return { state: "unhealthy", origin }; } } };
}
