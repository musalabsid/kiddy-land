import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import { createHostRuntime } from "../src/supervisor.ts";

const runtimes: Array<Awaited<ReturnType<typeof createHostRuntime>>> = [];
afterEach(async () => { for (const runtime of runtimes.splice(0)) await runtime.stop(); });

describe("calendar HTTP contract", () => {
  test("authenticates owner configuration and persists it across restart", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kiddy-calendar-http-"));
    const runtime = createHostRuntime({ dataDir, port: 43131 }); runtimes.push(runtime); await runtime.start();
    const base = runtime.server.url;
    const invitation = await (await fetch(`${base}/pairing/invitations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin: base }) })).json() as { token: string };
    const paired = await (await fetch(`${base}/pairing/redeem`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: invitation.token, mode: "Owner Dashboard" }) })).json() as { device: { id: string } };
    const login = await (await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: paired.device.id, username: "owner", password: "change-me" }) })).json() as { token: string };
    const auth = { authorization: `Bearer ${login.token}`, "content-type": "application/json" };
    expect((await fetch(`${base}/calendar/configure`, { method: "POST", headers: auth, body: JSON.stringify({ timezone: "Asia/Singapore", day: "monday", hours: { open: "09:00", close: "18:00" } }) })).status).toBe(200);
    const schedule = await (await fetch(`${base}/calendar/schedule?date=2024-01-01`)).json() as { hours: { open: string; close: string } };
    expect(schedule.hours).toEqual({ open: "09:00", close: "18:00" });
    expect((await fetch(`${base}/calendar/config`, { headers: { authorization: `Bearer ${login.token}` } })).status).toBe(200);
    await runtime.stop();
    const restarted = createHostRuntime({ dataDir, port: 43132 }); runtimes.push(restarted); await restarted.start();
    const restartedLogin = await (await fetch(`${restarted.server.url}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: paired.device.id, username: "owner", password: "change-me" }) })).json() as { token: string };
    const persisted = await (await fetch(`${restarted.server.url}/calendar/config`, { headers: { authorization: `Bearer ${restartedLogin.token}` } })).json() as { timezone: string };
    expect(persisted.timezone).toBe("Asia/Singapore");
    await rm(dataDir, { recursive: true, force: true });
  });
});
