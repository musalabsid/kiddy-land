import { describe, expect, test } from "bun:test";

import {
  createConnectionRegistry,
  createConnectionState,
} from "../src/connection.ts";
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

  test("allows pairing from a different origin on the same host", () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    // invitation created by desktop on its loopback API origin
    const invitation = identity.createEnrollment("http://127.0.0.1:43117");
    // scanned from the HTTPS LAN origin of the same machine
    const paired = identity.pair(
      invitation.token,
      "Entrance Scanner",
      "https://192.168.1.108:43118",
    );
    expect(paired.device.id).toBeTruthy();
    // and the reverse: LAN-created invite scanned from loopback https
    const invite2 = identity.createEnrollment("http://192.168.1.108:3000");
    const paired2 = identity.pair(
      invite2.token,
      "Cashier",
      "https://127.0.0.1:43118",
    );
    expect(paired2.device.id).toBeTruthy();
  });

  test("rejects pairing from a different host", () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    const invitation = identity.createEnrollment("http://localhost:3000");
    expect(() =>
      identity.pair(invitation.token, "Entrance Scanner", "https://evil.local"),
    ).toThrow();
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
    const denied = authorizeWebSocket(
      identity,
      registry,
      {
        authorization: `Bearer ${session.token}`,
        origin: "https://evil.local",
      },
      "https://kiddy.local",
      {
        close: () => {
          closed = true;
        },
      },
    );
    expect(denied.allowed).toBe(false);
    const allowed = authorizeWebSocket(
      identity,
      registry,
      {
        authorization: `Bearer ${session.token}`,
        origin: "https://kiddy.local",
      },
      "https://kiddy.local",
      {
        close: () => {
          closed = true;
        },
      },
    );
    expect(allowed.allowed).toBe(true);
    const queryAllowed = authorizeWebSocket(
      identity,
      registry,
      { accessToken: session.token, origin: "https://kiddy.local" },
      "https://kiddy.local",
      {
        close: () => {
          closed = true;
        },
      },
    );
    expect(queryAllowed.allowed).toBe(true);
    registry.register(paired.device.id, {
      close: () => {
        closed = true;
      },
    });
    identity.revokeDevice(paired.device.id);
    registry.closeDevice(paired.device.id);
    expect(closed).toBe(true);
  });
});
