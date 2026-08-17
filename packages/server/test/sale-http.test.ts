import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import { createHostRuntime } from "../src/supervisor.ts";
import { httpBootstrapOwner } from "./helpers.ts";

const runtimes: Array<Awaited<ReturnType<typeof createHostRuntime>>> = [];
afterEach(async () => { for (const runtime of runtimes.splice(0)) await runtime.stop(); });

describe("cashier sale HTTP workflow", () => {
  test("completes one sale, exposes artifacts, and records a failed print without changing it", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kiddy-sale-http-"));
    const runtime = createHostRuntime({ dataDir, port: 43133 }); runtimes.push(runtime); await runtime.start();
    const base = runtime.server.url;
    const owner = await httpBootstrapOwner(base);
    const ownerAuth = { authorization: `Bearer ${owner.token}`, "content-type": "application/json" };
    for (const day of ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]) await fetch(`${base}/calendar/configure`, { method: "POST", headers: ownerAuth, body: JSON.stringify({ day, hours: { open: "00:00", close: "23:59" } }) });
    await fetch(`${base}/calendar/configure`, { method: "POST", headers: ownerAuth, body: JSON.stringify({ package: { name: "Play", includedMinutes: 90, weekdayPrice: 50000, weekendPrice: 70000, overridePrices: {}, overtimeRate: 1000, deposit: 20000, depositPolicy: "return-remainder" } }) });
    const config = await (await fetch(`${base}/calendar/config`, { headers: ownerAuth })).json() as { packages: Array<{ id: string }> };
    const cashierInvite = await (await fetch(`${base}/pairing/invitations`, { method: "POST", headers: ownerAuth, body: JSON.stringify({ origin: base, staff: { name: "Test Cashier", role: "Cashier" } }) })).json() as { token: string };
    const cashierPair = await (await fetch(`${base}/pairing/redeem`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: cashierInvite.token, mode: "Cashier" }) })).json() as { device: { id: string } };
    const cashierLogin = await (await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: cashierPair.device.id, username: "owner", password: "change-me" }) })).json() as { token: string };
    const auth = { authorization: `Bearer ${cashierLogin.token}`, "content-type": "application/json" };
    const date = new Intl.DateTimeFormat("en-CA").format(new Date());
    const body = { idempotencyKey: "http-sale-1", cashierId: "cashier", operatingDate: date, paymentMethod: "QRIS", lines: [{ childId: "child-1", childName: "Alya", packageId: config.packages[0]!.id, paymentConfirmed: true }] };
    const created = await (await fetch(`${base}/sales`, { method: "POST", headers: auth, body: JSON.stringify(body) })).json() as { id: string; tickets: unknown[]; receipt: { number: string } };
    expect(created.tickets).toHaveLength(1);
    expect(created.receipt.number).toMatch(/^R-/);
    const duplicate = await (await fetch(`${base}/sales`, { method: "POST", headers: auth, body: JSON.stringify(body) })).json() as { id: string };
    expect(duplicate.id).toBe(created.id);
    const pdf = await fetch(`${base}/sales/${created.id}/artifacts/tickets`, { headers: { authorization: `Bearer ${cashierLogin.token}` } });
    expect(pdf.status).toBe(200); expect(pdf.headers.get("content-type")).toContain("application/pdf");
    const print = await fetch(`${base}/sales/${created.id}/print-attempts`, { method: "POST", headers: auth, body: JSON.stringify({ artifact: "tickets", status: "failed", reprint: false }) });
    expect(print.status).toBe(201);
    const unchanged = await (await fetch(`${base}/sales/${created.id}`, { headers: { authorization: `Bearer ${cashierLogin.token}` } })).json() as { id: string; status: string };
    expect(unchanged).toMatchObject({ id: created.id, status: "completed" });
    await rm(dataDir, { recursive: true, force: true });
  });
});
