import type { DeviceMode, IdentityStore } from "./identity.ts";
import type { ConnectionRegistry } from "./connection.ts";
import type { LifecycleStore } from "./lifecycle.ts";
import type { InventoryStore } from "./inventory.ts";

export type NotificationKind = "five-minute-remaining" | "ticket-expired" | "inventory-low" | "device-connected";
export type NotificationAlert = { id: string; type: "notification"; kind: NotificationKind; message: string; createdAt: number; sound: boolean };
export type NotificationSettings = { soundEnabled: boolean };

const defaultRoutes: Record<NotificationKind, readonly DeviceMode[]> = {
  "five-minute-remaining": ["Cashier", "Scanner"],
  "ticket-expired": ["Cashier", "Scanner"],
  "inventory-low": ["Owner Dashboard"],
  "device-connected": ["Cashier", "Scanner", "Inventory", "Owner Dashboard"],
};

export function createNotificationService(identity: IdentityStore, registry: ConnectionRegistry, lifecycle: LifecycleStore, inventory: InventoryStore) {
  const routes: Record<NotificationKind, DeviceMode[]> = Object.fromEntries(Object.entries(defaultRoutes).map(([kind, modes]) => [kind, [...modes]])) as Record<NotificationKind, DeviceMode[]>;
  const settings = new Map<string, NotificationSettings>();
  const notified = new Set<string>();
  const lowStockNotified = new Set<string>();
  const startedAt = Date.now();
  let sequence = 0;
  function configureRoutes(kind: NotificationKind, modes: DeviceMode[]) {
    if (!defaultRoutes[kind] || modes.some((mode) => mode === "Public Kiosk")) throw new Error("Public kiosk cannot receive private notifications");
    routes[kind] = [...new Set(modes)]; return routes[kind];
  }
  function configure(deviceId: string, value: Partial<NotificationSettings>) {
    if (value.soundEnabled !== undefined && typeof value.soundEnabled !== "boolean") throw new Error("soundEnabled must be boolean");
    const next = { soundEnabled: settings.get(deviceId)?.soundEnabled ?? true, ...(value.soundEnabled === undefined ? {} : { soundEnabled: value.soundEnabled }) };
    settings.set(deviceId, next); return next;
  }
  function publish(kind: NotificationKind, message: string, key = `${kind}:${message}`) {
    if (notified.has(key)) return;
    notified.add(key);
    const createdAt = Date.now();
    for (const device of identity.devices.values()) if (!device.revokedAt && routes[kind].includes(device.mode)) {
      const setting = settings.get(device.id) ?? { soundEnabled: true };
      const alert: NotificationAlert = { id: `alert_${++sequence}`, type: "notification", kind, message, createdAt, sound: setting.soundEnabled };
      registry.sendDevice?.(device.id, alert);
    }
  }
  function deviceConnected(deviceId: string) { publish("device-connected", "A device connected", `device-connected:${deviceId}:${Date.now()}`); }
  function check() {
    const now = Date.now();
    for (const session of lifecycle.sessions.values()) if (session.status === "active") {
      const ticket = lifecycle.findTicket(session.ticketId); const minutes = ticket?.package.includedMinutes;
      if (ticket && minutes !== null && minutes !== undefined && minutesBetween(session.enteredAt, now) >= Math.max(0, minutes - 5)) publish("five-minute-remaining", "A play session has five minutes remaining", `five:${session.ticketId}`);
    }
    for (const event of lifecycle.events) if (event.type === "expired" && event.at >= startedAt) publish("ticket-expired", "A ticket expired", `expired:${event.ticketId}:${event.at}`);
    for (const item of inventory.list(undefined, false)) {
      const low = item.stock <= item.lowStockThreshold;
      if (low && !lowStockNotified.has(item.id)) { lowStockNotified.add(item.id); publish("inventory-low", "Inventory is low", `inventory:${item.id}:${item.stock}`); }
      if (!low) lowStockNotified.delete(item.id);
    }
  }
  return { configure, configureRoutes, publish, deviceConnected, check, settings, routes };
}
function minutesBetween(start: number, end: number) { return Math.max(0, Math.floor((end - start) / 60_000)); }
export type NotificationService = ReturnType<typeof createNotificationService>;
