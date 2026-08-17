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

describe("device deletion", () => {
  test("delete removes the device permanently (hard delete)", async () => {
    const identity = createIdentityStore();
    const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 6, database: "ready", uptimeMs: 1 }), identity);
    const owner = await appBootstrapOwner(app);
    const paired = await appPairDevice(app, owner.token, "Entrance Scanner");
    const list = await json(app, "/pairing/devices", { headers: { authorization: `Bearer ${owner.token}` } });
    expect(list.body.devices.some((d: { id: string }) => d.id === paired.deviceId)).toBe(true);
    const del = await json(app, "/pairing/devices/" + paired.deviceId, { method: "DELETE", headers: { authorization: `Bearer ${owner.token}` } });
    expect(del.status).toBe(200);
    const after = await json(app, "/pairing/devices", { headers: { authorization: `Bearer ${owner.token}` } });
    expect(after.body.devices.some((d: { id: string }) => d.id === paired.deviceId)).toBe(false);
    // non-owner cannot delete
    const guest = await json(app, "/pairing/devices/" + paired.deviceId, { method: "DELETE", headers: { authorization: "Bearer invalid" } });
    expect(guest.status).toBe(403);
  });
});

describe("owner device protection", () => {
  test("cannot revoke or delete the owner device", async () => {
    const identity = createIdentityStore();
    const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 6, database: "ready", uptimeMs: 1 }), identity);
    const owner = await appBootstrapOwner(app); // creates the owner device
    const ownerDeviceId = owner.deviceId;
    const revoke = await json(app, `/pairing/devices/${ownerDeviceId}/revoke`, { method: "POST", headers: { authorization: `Bearer ${owner.token}` }, body: "{}" });
    expect(revoke.status).toBe(409);
    const del = await json(app, `/pairing/devices/${ownerDeviceId}`, { method: "DELETE", headers: { authorization: `Bearer ${owner.token}` } });
    expect(del.status).toBe(409);
    // owner device still listed
    const list = await json(app, "/pairing/devices", { headers: { authorization: `Bearer ${owner.token}` } });
    expect(list.body.devices.some((d: { id: string }) => d.id === ownerDeviceId)).toBe(true);
  });

  test("non-owner devices can still be deleted", async () => {
    const identity = createIdentityStore();
    const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 6, database: "ready", uptimeMs: 1 }), identity);
    const owner = await appBootstrapOwner(app);
    const paired = await appPairDevice(app, owner.token, "Entrance Scanner");
    const del = await json(app, `/pairing/devices/${paired.deviceId}`, { method: "DELETE", headers: { authorization: `Bearer ${owner.token}` } });
    expect(del.status).toBe(200);
  });
});

describe("device self-logout deletion", () => {
  test("a non-owner device can delete itself, but not another device", async () => {
    const identity = createIdentityStore();
    const app = createApp(() => ({ status: "ready", service: "local-server", schemaVersion: 6, database: "ready", uptimeMs: 1 }), identity);
    const owner = await appBootstrapOwner(app);
    const staff = await appPairDevice(app, owner.token, "Cashier");
    const other = await appPairDevice(app, owner.token, "Entrance Scanner");
    const denied = await json(app, `/pairing/devices/${other.deviceId}`, { method: "DELETE", headers: { authorization: `Bearer ${staff.token}` } });
    expect(denied.status).toBe(403);
    const self = await json(app, `/pairing/devices/${staff.deviceId}`, { method: "DELETE", headers: { authorization: `Bearer ${staff.token}` } });
    expect(self.status).toBe(200);
    const session = await json(app, "/auth/session", { headers: { authorization: `Bearer ${staff.token}` } });
    expect(session.status).toBe(401);
  });
});
