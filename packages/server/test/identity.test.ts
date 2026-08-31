import { describe, expect, test } from "bun:test";

import { createIdentityStore } from "../src/identity.ts";

describe("identity and pairing", () => {
  test("bootstraps one local Owner Dashboard and rejects repeats", () => {
    const identity = createIdentityStore();
    expect(identity.isBootstrapped()).toBe(false);
    const result = identity.bootstrap("secure-password");
    expect(result.device.mode).toBe("Owner Dashboard");
    expect(identity.authenticate(result.session.token)?.user?.role).toBe(
      "Owner",
    );
    expect(identity.isBootstrapped()).toBe(true);
    expect(() => identity.bootstrap("another-password")).toThrow();
  });

  test("redeems a private invitation exactly once and requires login", () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    const invitation = identity.createEnrollment(
      "https://kiddy.local",
      "private",
    );
    const paired = identity.pair(invitation.token, "Cashier");
    expect(paired.session).toBeUndefined();
    expect(identity.authenticate(undefined)).toBeUndefined();
    const session = identity.login(paired.device.id, "owner", "secret");
    expect(identity.authenticate(session.token)?.device.mode).toBe("Cashier");
    expect(() => identity.pair(invitation.token, "Cashier")).toThrow();
  });

  test("public kiosk gets restricted session and capability", () => {
    const identity = createIdentityStore();
    const invitation = identity.createEnrollment(
      "https://kiddy.local",
      "public-kiosk",
    );
    const paired = identity.pair(invitation.token, "Public Kiosk");
    expect(paired.session).toBeDefined();
    const current = identity.authenticate(paired.session?.token);
    expect(current).toBeDefined();
    expect(identity.can(current!, "public:read")).toBe(true);
    expect(identity.can(current!, "write")).toBe(false);
  });

  test("revocation invalidates existing sessions", () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    const invitation = identity.createEnrollment("https://kiddy.local");
    const paired = identity.pair(invitation.token, "Owner Dashboard");
    const session = identity.login(paired.device.id, "owner", "secret");
    identity.revokeDevice(paired.device.id);
    expect(identity.authenticate(session.token)).toBeUndefined();
  });
});
