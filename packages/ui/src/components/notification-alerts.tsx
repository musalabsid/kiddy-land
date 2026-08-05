import * as React from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import type { ServerEvent } from "@kiddy-land/client";
import { useClient, useSession } from "@kiddy-land/client/react";

export function useNotificationSound() {
  const client = useClient();
  const { session } = useSession();
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [audioReady, setAudioReady] = React.useState(false);
  const [events, setEvents] = React.useState<ServerEvent[]>([]);
  React.useEffect(() => { if (session) void client.get<{ soundEnabled: boolean }>("/notifications/settings").then((value) => setSoundEnabled(value.soundEnabled)).catch(() => undefined); }, [client, session]);
  React.useEffect(() => { const handler = (event: Event) => { const detail = (event as CustomEvent<ServerEvent>).detail; if (detail?.type === "notification") setEvents((current) => [...current.slice(-19), detail]); }; window.addEventListener("kiddy-land-notification", handler); return () => window.removeEventListener("kiddy-land-notification", handler); }, []);
  React.useEffect(() => { if (!audioReady) return; for (const event of events) if (event.type === "notification" && event.sound && typeof window !== "undefined") { try { const context = new AudioContext(); void context.resume().then(() => { const oscillator = context.createOscillator(); oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.08); }); } catch { /* visual alert remains available */ } } }, [audioReady, events]);
  return { soundEnabled, setSoundEnabled: (enabled: boolean) => { setSoundEnabled(enabled); setAudioReady(true); void client.patch("/notifications/settings", { soundEnabled: enabled }); } };
}

export function NotificationAlerts() {
  useNotificationSound();
  const [events, setEvents] = React.useState<ServerEvent[]>([]);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  React.useEffect(() => { const handler = (event: Event) => { const detail = (event as CustomEvent<ServerEvent>).detail; if (detail?.type === "notification") setEvents((current) => [...current.slice(-19), detail]); }; window.addEventListener("kiddy-land-notification", handler); return () => window.removeEventListener("kiddy-land-notification", handler); }, []);
  const alerts = events.filter((event) => event.type === "notification" && typeof event.id === "string" && !dismissed.has(event.id));
  return <section aria-live="polite" className="fixed right-4 top-14 z-50 grid w-80 gap-3">{alerts.map((alert) => <Card key={String(alert.id)}><CardHeader className="flex flex-row items-center justify-between gap-2"><CardTitle className="text-sm">{String(alert.kind)}</CardTitle><Button variant="ghost" size="icon" aria-label="Dismiss alert" onClick={() => setDismissed((current) => new Set(current).add(String(alert.id)))}><X /></Button></CardHeader><CardContent className="flex items-center gap-2 text-sm"><Bell className="size-4 text-primary" />{String(alert.message)}</CardContent></Card>)}</section>;
}
export function SoundPreference({ enabled, onChange, className }: { enabled: boolean; onChange: (enabled: boolean) => void; className?: string }) { return <Button variant="outline" size="sm" className={className} onClick={() => onChange(!enabled)}>{enabled ? <Bell /> : <BellOff />}{enabled ? "Sound on" : "Sound off"}</Button>; }
