import { describe, expect, test } from "bun:test";

import { createCalendarStore } from "../src/calendar.ts";
import { createConnectionRegistry } from "../src/connection.ts";
import { createIdentityStore } from "../src/identity.ts";
import { createInventoryStore } from "../src/inventory.ts";
import { createLifecycleStore } from "../src/lifecycle.ts";
import { createNotificationService } from "../src/notifications.ts";
import { createSaleStore } from "../src/sale.ts";

describe("notifications", () => {
  test("routes private alerts and excludes public kiosks", () => {
    const identity = createIdentityStore();
    const registry = createConnectionRegistry();
    const calendar = createCalendarStore();
    const inventory = createInventoryStore();
    const sales = createSaleStore(calendar, undefined, inventory);
    const lifecycle = createLifecycleStore(sales, calendar);
    const notifications = createNotificationService(
      identity,
      registry,
      lifecycle,
      inventory,
    );
    const ownerDevice = identity.pair(
      identity.createEnrollment("http://x").token,
      "Cashier",
    ).device;
    const publicDevice = identity.pair(
      identity.createEnrollment("http://x", "public-kiosk").token,
      "Public Kiosk",
    ).device;
    const ownerEvents: unknown[] = [];
    const publicEvents: unknown[] = [];
    registry.register(ownerDevice.id, {
      send: (value) => ownerEvents.push(JSON.parse(value)),
      close: () => undefined,
    });
    registry.register(publicDevice.id, {
      send: (value) => publicEvents.push(JSON.parse(value)),
      close: () => undefined,
    });
    notifications.publish("ticket-expired", "A ticket expired");
    expect(ownerEvents).toHaveLength(1);
    expect(publicEvents).toHaveLength(0);
  });
  test("validates and controls per-device sound", () => {
    const identity = createIdentityStore();
    const registry = createConnectionRegistry();
    const calendar = createCalendarStore();
    const inventory = createInventoryStore();
    const sales = createSaleStore(calendar, undefined, inventory);
    const lifecycle = createLifecycleStore(sales, calendar);
    const notifications = createNotificationService(
      identity,
      registry,
      lifecycle,
      inventory,
    );
    const device = identity.pair(
      identity.createEnrollment("http://x").token,
      "Cashier",
    ).device;
    const events: unknown[] = [];
    registry.register(device.id, {
      send: (value) => events.push(JSON.parse(value)),
      close: () => undefined,
    });
    expect(() =>
      notifications.configure(device.id, { soundEnabled: "no" as never }),
    ).toThrow();
    notifications.configure(device.id, { soundEnabled: false });
    notifications.publish("device-connected", "A device connected");
    expect((events[0] as { sound: boolean }).sound).toBe(false);
  });
});
