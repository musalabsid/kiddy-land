import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocale, translate, isLocale, type Locale } from "@workspace/ui/lib/i18n";
import type { MessageKey } from "@workspace/ui/lib/translations";
import "./App.css";

type HostState = "starting" | "ready" | "unhealthy" | "fatal";
type HostStatus = { state: HostState; origin?: string; database?: string };
const origin = import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";

async function readStatus(): Promise<HostStatus> { try { const response = await fetch(`${origin}/ready`); const report = await response.json() as { status?: HostState; database?: string }; return { state: report.status ?? (response.ok ? "ready" : "unhealthy"), origin, database: report.database }; } catch { return { state: "unhealthy", origin }; } }

export default function App() {
  const { locale, setLocale, t } = useLocale();
  const [status, setStatus] = useState<HostStatus>({ state: "starting" });
  const [busy, setBusy] = useState(false);
  const check = useCallback(async () => { setBusy(true); setStatus(await readStatus()); setBusy(false); }, []);
  useEffect(() => { void check(); const timer = window.setInterval(() => void check(), 5000); return () => window.clearInterval(timer); }, [check]);
  async function stop() { setBusy(true); await invoke("stop_host"); await check(); }
  const titleKey: MessageKey = status.state === "ready" ? "host.ready" : status.state === "fatal" ? "host.fatal" : status.state === "starting" ? "host.starting" : "host.unhealthy";
  return <main className="host-shell"><header><p className="eyebrow">{t("host.eyebrow")}</p><h1>{t("host.title")}</h1><p className="subhead">{t("host.subtitle")}</p></header><div className="toolbar"><button onClick={() => setLocale(locale === "id" ? "en" : "id")}>{locale === "id" ? "EN" : "ID"}</button><button onClick={() => void check()} disabled={busy}>{busy ? "…" : t("host.check")}</button></div><section className="status-card"><div className="status-copy"><span className={`status-dot ${status.state}`} /><div><h2>{t(titleKey)}</h2><p>{status.state === "ready" ? t("host.readyDescription") : t("host.notReadyDescription")}</p></div></div><strong className={`pill ${status.state}`}>{status.state}</strong></section><section className="facts"><div><b>{t("host.localFirst")}</b><span>{t("host.localFirstDescription")}</span></div><div><b>{t("host.authoritative")}</b><span>{t("host.authoritativeDescription")}</span></div><div><b>{t("host.database")}</b><span>{status.database ?? t("host.unknown")}</span></div></section><div className="actions"><button className="quiet" onClick={() => void stop()} disabled={busy}>{t("host.stop")}</button></div><footer>{origin}</footer></main>;
}

export function localeLabel(locale: Locale) { return translate(locale, `language.${locale}` as MessageKey); }
export function hasLocale(value: string | null): value is Locale { return isLocale(value); }
