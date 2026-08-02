import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createApp } from "../src/app.ts";
import { createCalendarStore } from "../src/calendar.ts";
import { createIdentityStore } from "../src/identity.ts";
import { createLifecycleStore } from "../src/lifecycle.ts";
import { createSaleStore } from "../src/sale.ts";

async function json(app: Hono, path: string, init: RequestInit = {}) {
  const response = await app.fetch(new Request(`http://local${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } }));
  return { response, body: await response.json() as any };
}

describe("ticket lifecycle HTTP contract", () => {
  test("scanner routes perform idempotent entry/exit and recovery without changing ticket identity", async () => {
    const identity = createIdentityStore(); const calendar = createCalendarStore();
    for (const day of ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const) calendar.setWeeklyHours(day, { open: "00:00", close: "23:59" }, "owner");
    const pkg = calendar.upsertPackage({ name: "Play", includedMinutes: 60, weekdayPrice: 50_000, weekendPrice: 70_000, overridePrices: {}, overtimeRate: 1_000, deposit: 20_000, depositPolicy: "return-remainder" }, "owner");
    const sales = createSaleStore(calendar); const date = new Intl.DateTimeFormat("en-CA", { timeZone: calendar.timezone }).format(new Date());
    const sale = sales.complete({ idempotencyKey: "lifecycle-http", cashierId: "owner", operatingDate: date, paymentMethod: "cash", lines: [{ childId: "child-1", packageId: pkg.id }] });
    const lifecycle = createLifecycleStore(sales, calendar); const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 2, database: "ready", uptimeMs: 1 }), identity, undefined, calendar, sales, lifecycle);
    const invite = await json(app, "/pairing/invitations", { method: "POST", body: JSON.stringify({ origin: "http://local" }) });
    const paired = await json(app, "/pairing/redeem", { method: "POST", body: JSON.stringify({ token: invite.body.token, mode: "Entrance Scanner" }) });
    const login = await json(app, "/auth/login", { method: "POST", body: JSON.stringify({ deviceId: paired.body.device.id, username: "owner", password: "change-me" }) });
    const auth = { authorization: `Bearer ${login.body.token}` };
    const entered = await json(app, "/tickets/scan/entry", { method: "POST", headers: auth, body: JSON.stringify({ code: sale.tickets[0]!.code }) });
    expect(entered.response.status).toBe(200); expect(entered.body.session.status).toBe("active");
    const duplicate = await json(app, "/tickets/scan/entry", { method: "POST", headers: auth, body: JSON.stringify({ code: sale.tickets[0]!.code }) });
    expect(duplicate.body.session.id).toBe(entered.body.session.id);

    const exitInvite = await json(app, "/pairing/invitations", { method: "POST", body: JSON.stringify({ origin: "http://local" }) });
    const exitPair = await json(app, "/pairing/redeem", { method: "POST", body: JSON.stringify({ token: exitInvite.body.token, mode: "Exit Scanner" }) });
    const exitLogin = await json(app, "/auth/login", { method: "POST", body: JSON.stringify({ deviceId: exitPair.body.device.id, username: "owner", password: "change-me" }) });
    const exited = await json(app, "/tickets/scan/exit", { method: "POST", headers: { authorization: `Bearer ${exitLogin.body.token}` }, body: JSON.stringify({ code: sale.tickets[0]!.code }) });
    expect(exited.body.state).toBe("completed"); expect(exited.body.session.outstandingCharge).toBe(0);
    const duplicateExit = await json(app, "/tickets/scan/exit", { method: "POST", headers: { authorization: `Bearer ${exitLogin.body.token}` }, body: JSON.stringify({ code: sale.tickets[0]!.code }) });
    expect(duplicateExit.body.message).toBe("Ticket already settled");

    const collectAttempt = await json(app, "/tickets/" + sale.tickets[0]!.id + "/collect-charge", { method: "POST", headers: { authorization: `Bearer ${exitLogin.body.token}` }, body: JSON.stringify({ amount: 1, paymentMethod: "cash" }) });
    expect(collectAttempt.response.status).toBe(403);

    const recovery = await json(app, "/tickets/recover", { method: "POST", headers: auth, body: JSON.stringify({ code: sale.tickets[0]!.code, childId: "child-1" }) });
    expect(recovery.body.ticketId).toBe(sale.tickets[0]!.id); expect(recovery.body.qrToken).toBe(sale.tickets[0]!.qrToken);
  });
});
