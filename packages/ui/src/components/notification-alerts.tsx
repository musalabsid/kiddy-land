import * as React from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import type { ServerEvent } from "@kiddy-land/client";
import { useClient, useSession } from "@kiddy-land/client/react";

export function NotificationAlerts() {
  const client = useClient();
  const { session } = useSession();
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [events, setEvents] = React.useState<ServerEvent[]>([]);
  React.useEffect(() => { if (session) void client.get<{ soundEnabled: boolean }>("/notifications/settings").then((value) => setSoundEnabled(value.soundEnabled)).catch(() => undefined); }, [client, session]);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  React.useEffect(() => { const handler = (event: Event) => { const detail = (event as CustomEvent<ServerEvent>).detail; if (detail?.type === "notification") setEvents((current) => [...current.slice(-19), detail]); }; window.addEventListener("kiddy-land-notification", handler); return () => window.removeEventListener("kiddy-land-notification", handler); }, []);
  React.useEffect(() => { for (const event of events) if (event.type === "notification" && event.sound && typeof window !== "undefined") { try { const context = new AudioContext(); const oscillator = context.createOscillator(); oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.08); } catch { /* visual alert remains available */ } } }, [events]);
  const alerts = events.filter((event) => event.type === "notification" && typeof event.id === "string" && !dismissed.has(event.id));
  return <section aria-live="polite" className="fixed right-4 top-4 z-50 grid w-80 gap-3"><SoundPreference enabled={soundEnabled} onChange={(enabled) => { setSoundEnabled(enabled); void client.patch("/notifications/settings", { soundEnabled: enabled }); }} />{alerts.map((alert) => <Card key={String(alert.id)}><CardHeader className="flex flex-row items-center justify-between gap-2"><CardTitle className="text-sm">{String(alert.kind)}</CardTitle><Button variant="ghost" size="icon" aria-label="Dismiss alert" onClick={() => setDismissed((current) => new Set(current).add(String(alert.id)))}><X /></Button></CardHeader><CardContent className="flex items-center gap-2 text-sm"><Bell className="size-4 text-primary" />{String(alert.message)}</CardContent></Card>)}</section>;
}
export function SoundPreference({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) { return <Button variant="outline" onClick={() => onChange(!enabled)}>{enabled ? <Bell /> : <BellOff />}{enabled ? "Sound on" : "Sound off"}</Button>; }
