import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { openLocalDatabase } from "../src/database.ts";
import { createIdentityStore } from "../src/identity.ts";

describe("identity persistence", () => {
  test("keeps devices and revocations across identity store recreation", async () => {
    const path = `/tmp/kiddy-identity-${crypto.randomUUID()}.sqlite`;
    const firstDb = openLocalDatabase(path);
    const first = createIdentityStore({
      ownerPassword: "secret",
      database: firstDb,
    });
    const invitation = first.createEnrollment("https://kiddy.local");
    const device = first.pair(invitation.token, "Cashier").device;
    const activeInvitation = first.createEnrollment("https://kiddy.local");
    const activeDevice = first.pair(
      activeInvitation.token,
      "Owner Dashboard",
    ).device;
    first.revokeDevice(device.id);
    firstDb.close();

    const secondDb = openLocalDatabase(path);
    const second = createIdentityStore({ database: secondDb });
    expect(second.devices.get(device.id)?.revokedAt).toBeDefined();
    expect(() =>
      second.login(activeDevice.id, "owner", "secret"),
    ).not.toThrow();
    secondDb.close();
    await rm(path, { force: true });
    await rm(`${path}-wal`, { force: true });
    await rm(`${path}-shm`, { force: true });
  });
});
