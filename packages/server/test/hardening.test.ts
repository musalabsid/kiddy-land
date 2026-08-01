import { describe, expect, test } from "bun:test";
import { createConnectionRegistry, createConnectionState } from "../src/connection.ts";
import { createIdentityStore } from "../src/identity.ts";
import { authorizeWebSocket } from "../src/realtime.ts";

describe("ticket 18 hardening", () => {
  test("requires refresh before writes after reconnect", () => {
    const state = createConnectionState();
    expect(state.get().canWrite).toBe(true);
    state.disconnect();
    state.reconnect();
    expect(state.get().canWrite).toBe(false);
    state.synchronized();
    expect(state.get().canWrite).toBe(true);
  });

  test("applies device mode and role intersection", () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    const invitation = identity.createEnrollment("https://kiddy.local");
    const paired = identity.pair(invitation.token, "Entrance Scanner");
    const session = identity.login(paired.device.id, "owner", "secret");
    const current = identity.authenticate(session.token)!;
    expect(identity.can(current, "ticket:admit")).toBe(true);
    expect(identity.can(current, "admin")).toBe(false);
  });

  test("authorizes websocket origin and closes registered device", () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    const registry = createConnectionRegistry();
    const invitation = identity.createEnrollment("https://kiddy.local");
    const paired = identity.pair(invitation.token, "Cashier");
    const session = identity.login(paired.device.id, "owner", "secret");
    let closed = false;
    const denied = authorizeWebSocket(identity, registry, { authorization: `Bearer ${session.token}`, origin: "https://evil.local" }, "https://kiddy.local", { close: () => { closed = true; } });
    expect(denied.allowed).toBe(false);
    const allowed = authorizeWebSocket(identity, registry, { authorization: `Bearer ${session.token}`, origin: "https://kiddy.local" }, "https://kiddy.local", { close: () => { closed = true; } });
    expect(allowed.allowed).toBe(true);
    registry.register(paired.device.id, { close: () => { closed = true; } });
    identity.revokeDevice(paired.device.id);
    registry.closeDevice(paired.device.id);
    expect(closed).toBe(true);
  });
});
