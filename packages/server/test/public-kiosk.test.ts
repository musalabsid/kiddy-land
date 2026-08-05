import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createApp } from "../src/app.ts";
import { createCalendarStore } from "../src/calendar.ts";
import { createIdentityStore } from "../src/identity.ts";
import { createInventoryStore } from "../src/inventory.ts";
import { createLifecycleStore } from "../src/lifecycle.ts";
import { createSaleStore } from "../src/sale.ts";
import { appBootstrapOwner, appPairDevice } from "./helpers.ts";

async function json(app: Hono, path: string, init: RequestInit = {}) { const response = await app.fetch(new Request(`http://local${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } })); return { response, body: await response.json() as any }; }

describe("restricted public kiosk", () => {
  test("validates tickets and exposes only public product fields", async () => {
    const identity = createIdentityStore(); const calendar = createCalendarStore();
    for (const day of ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const) calendar.setWeeklyHours(day, { open: "00:00", close: "23:59" }, "owner");
    const pkg = calendar.upsertPackage({ name: "Play", includedMinutes: 60, weekdayPrice: 50_000, weekendPrice: 50_000, overridePrices: {}, overtimeRate: 1_000, deposit: 20_000, depositPolicy: "return-remainder" }, "owner");
    const sales = createSaleStore(calendar); const sale = sales.complete({ idempotencyKey: "kiosk", cashierId: "owner", operatingDate: new Intl.DateTimeFormat("en-CA", { timeZone: calendar.timezone }).format(new Date()), paymentMethod: "cash", lines: [{ childId: "private-child", packageId: pkg.id }] });
    const inventory = createInventoryStore(); const product = inventory.create({ sku: "SKU-1", name: "Juice", price: 7_500, stock: 4 }, "owner"); const lifecycle = createLifecycleStore(sales, calendar); const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 1, database: "ready", uptimeMs: 1 }), identity, undefined, calendar, sales, lifecycle, inventory);
    const owner = await appBootstrapOwner(app);
    const kiosk = await appPairDevice(app, owner.token, "Public Kiosk", "public-kiosk");
    const auth = { authorization: `Bearer ${kiosk.token}` };
    const ticket = await json(app, "/public/tickets/validate", { method: "POST", headers: auth, body: JSON.stringify({ code: sale.tickets[0].code }) }); expect(ticket.body).toEqual({ ok: true, state: "waiting", message: "Ticket is valid", remainingMinutes: 60 });
    const products = await json(app, "/public/products", { headers: auth }); expect(products.body).toEqual([{ id: product.id, sku: product.sku, name: product.name, price: product.price }]);
    expect((await json(app, "/products", { headers: auth })).response.status).toBe(401); expect((await json(app, "/sales", { method: "POST", headers: auth, body: "{}" })).response.status).toBe(403);
  });
});
