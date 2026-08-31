import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createHostRuntime } from "../src/supervisor.ts";
import { httpBootstrapOwner } from "./helpers.ts";

const runtimes: Array<Awaited<ReturnType<typeof createHostRuntime>>> = [];
afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.stop();
});

describe("calendar HTTP contract", () => {
  test("authenticates owner configuration and persists it across restart", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kiddy-calendar-http-"));
    const runtime = createHostRuntime({ dataDir, port: 43131 });
    runtimes.push(runtime);
    await runtime.start();
    const base = runtime.server.url;
    const owner = await httpBootstrapOwner(base);
    const auth = {
      authorization: `Bearer ${owner.token}`,
      "content-type": "application/json",
    };
    expect(
      (
        await fetch(`${base}/calendar/configure`, {
          method: "POST",
          headers: auth,
          body: JSON.stringify({
            timezone: "Asia/Singapore",
            day: "monday",
            hours: { open: "09:00", close: "18:00" },
          }),
        })
      ).status,
    ).toBe(200);
    const schedule = (await (
      await fetch(`${base}/calendar/schedule?date=2024-01-01`)
    ).json()) as { hours: { open: string; close: string } };
    expect(schedule.hours).toEqual({ open: "09:00", close: "18:00" });
    expect(
      (
        await fetch(`${base}/calendar/config`, {
          headers: { authorization: `Bearer ${owner.token}` },
        })
      ).status,
    ).toBe(200);
    const created = await fetch(`${base}/calendar/configure`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        package: {
          name: "Play",
          includedMinutes: 60,
          weekdayPrice: 15000,
          weekendPrice: 20000,
          overridePrices: {},
          overtimeRate: 1000,
          deposit: 5000,
          depositPolicy: "return-remainder",
        },
      }),
    });
    expect(created.status).toBe(200);
    const configured = (await (
      await fetch(`${base}/calendar/config`, {
        headers: { authorization: `Bearer ${owner.token}` },
      })
    ).json()) as { packages: Array<{ id: string; active: boolean }> };
    const packageId = configured.packages.at(-1)?.id;
    expect(packageId).toBeDefined();
    expect(
      (
        await fetch(`${base}/calendar/packages/${packageId}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${owner.token}` },
        })
      ).status,
    ).toBe(200);
    const archived = (await (
      await fetch(`${base}/calendar/config`, {
        headers: { authorization: `Bearer ${owner.token}` },
      })
    ).json()) as { packages: Array<{ id: string; active: boolean }> };
    expect(
      archived.packages.find((item) => item.id === packageId)?.active,
    ).toBe(false);
    await runtime.stop();
    const restarted = createHostRuntime({ dataDir, port: 43132 });
    runtimes.push(restarted);
    await restarted.start();
    const restartedLogin = (await (
      await fetch(`${restarted.server.url}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: owner.deviceId,
          username: "owner",
          password: "change-me",
        }),
      })
    ).json()) as { token: string };
    const persisted = (await (
      await fetch(`${restarted.server.url}/calendar/config`, {
        headers: { authorization: `Bearer ${restartedLogin.token}` },
      })
    ).json()) as { timezone: string };
    expect(persisted.timezone).toBe("Asia/Singapore");
    await rm(dataDir, { recursive: true, force: true });
  });
});
