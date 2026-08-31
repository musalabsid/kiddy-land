import type { ServerEvent } from "./api/types";

export type NotificationListener = (event: ServerEvent) => void;
export type NotificationInbox = ReturnType<typeof createNotificationInbox>;
export function createNotificationInbox() {
  let alerts: ServerEvent[] = [];
  const listeners = new Set<NotificationListener>();
  return {
    receive(event: ServerEvent) {
      if (event.type === "notification") {
        alerts = [...alerts, event];
        for (const listener of listeners) listener(event);
      }
    },
    list() {
      return alerts;
    },
    dismiss(id: string) {
      alerts = alerts.filter((event) => event.id !== id);
      for (const listener of listeners)
        listener({ type: "notification-dismissed", id });
    },
    subscribe(listener: NotificationListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
