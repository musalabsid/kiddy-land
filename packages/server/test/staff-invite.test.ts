import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createApp } from "../src/app.ts";
import { createIdentityStore } from "../src/identity.ts";
import { appBootstrapOwner, appPairDevice } from "./helpers.ts";

async function json(app: Hono, path: string, init: RequestInit = {}) {
  const response = await app.fetch(new Request(`http://local${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } }));
  return { status: response.status, body: await response.json().catch(() => ({})) as any };
}

describe("staff-invite pairing", () => {
  test("invite with staff creates a staff user and auto-logs-in the device", async () => {
    const identity = createIdentityStore();
    const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 6, database: "ready", uptimeMs: 1 }), identity);
    const owner = await appBootstrapOwner(app);
    // owner creates invite with staff name+role
    const invite = await json(app, "/pairing/invitations", { method: "POST", headers: { authorization: `Bearer ${owner.token}` }, body: JSON.stringify({ origin: "http://local", kind: "private", staff: { name: "Budi", role: "Cashier" } }) });
    expect(invite.status).toBe(201);
    expect(invite.body.qrPayload).toContain('"staff"');
    // phone scans and pairs — gets a session immediately (no login needed)
    const pair = await json(app, "/pairing/redeem", { method: "POST", headers: { origin: "http://local" }, body: JSON.stringify({ token: invite.body.token, mode: "Cashier" }) });
    expect(pair.status).toBe(201);
    expect(pair.body.session?.token).toBeTruthy();
    // the session is bound to the created staff user
    const session = await json(app, "/auth/session", { headers: { authorization: `Bearer ${pair.body.session.token}` } });
    expect(session.body.user?.role).toBe("Cashier");
    expect(session.body.user?.username).toMatch(/^staff-/);
    // a second pair of the same token fails (single-use)
    const again = await json(app, "/pairing/redeem", { method: "POST", headers: { origin: "http://local" }, body: JSON.stringify({ token: invite.body.token, mode: "Cashier" }) });
    expect(again.status).toBe(409);
  });

  test("kiosk invite without staff still auto-logs-in (existing behavior)", async () => {
    const identity = createIdentityStore();
    const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 6, database: "ready", uptimeMs: 1 }), identity);
    const owner = await appBootstrapOwner(app);
    const kiosk = await appPairDevice(app, owner.token, "Public Kiosk", "public-kiosk");
    expect(kiosk.token).toBeTruthy();
  });
});
