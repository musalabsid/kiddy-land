import type { ServerEvent } from "@kiddy-land/client";
import { useClient, useSession } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import { Bell, BellOff } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export function useNotificationSound() {
  const client = useClient();
  const { session } = useSession();
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [audioReady, setAudioReady] = React.useState(false);
  const [events, setEvents] = React.useState<ServerEvent[]>([]);
  React.useEffect(() => {
    if (session)
      void client
        .get<{ soundEnabled: boolean }>("/notifications/settings")
        .then((value) => setSoundEnabled(value.soundEnabled))
        .catch(() => undefined);
  }, [client, session]);
  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ServerEvent>).detail;
      if (detail?.type === "notification")
        setEvents((current) => [...current.slice(-19), detail]);
    };
    window.addEventListener("kiddy-land-notification", handler);
    return () => window.removeEventListener("kiddy-land-notification", handler);
  }, []);
  React.useEffect(() => {
    if (!audioReady) return;
    for (const event of events)
      if (
        event.type === "notification" &&
        event.sound &&
        typeof window !== "undefined"
      ) {
        try {
          const context = new AudioContext();
          void context.resume().then(() => {
            const oscillator = context.createOscillator();
            oscillator.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.08);
          });
        } catch {
          /* visual alert remains available */
        }
      }
  }, [audioReady, events]);
  return {
    soundEnabled,
    setSoundEnabled: (enabled: boolean) => {
      setSoundEnabled(enabled);
      setAudioReady(true);
      void client.patch("/notifications/settings", { soundEnabled: enabled });
    },
  };
}

export function NotificationAlerts() {
  useNotificationSound();
  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ServerEvent>).detail;
      if (detail?.type === "notification") {
        toast.info(String(detail.message ?? detail.kind), { duration: 4000 });
      }
    };
    window.addEventListener("kiddy-land-notification", handler);
    return () => window.removeEventListener("kiddy-land-notification", handler);
  }, []);
  return null;
}
export function SoundPreference({
  enabled,
  onChange,
  className,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => onChange(!enabled)}
    >
      {enabled ? <Bell /> : <BellOff />}
      {enabled ? "Sound on" : "Sound off"}
    </Button>
  );
}
