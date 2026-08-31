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
async function login(
  runtime: Awaited<ReturnType<typeof createHostRuntime>>,
  mode: "Cashier" | "Owner Dashboard",
  ownerToken: string,
) {
  const base = runtime.server.url;
  const invite = (await (
    await fetch(`${base}/pairing/invitations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        origin: base,
        staff: { name: "Test Cashier", role: "Cashier" },
      }),
    })
  ).json()) as { token: string };
  const pair = (await (
    await fetch(`${base}/pairing/redeem`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: invite.token, mode }),
    })
  ).json()) as { device: { id: string } };
  return (
    (await (
      await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: pair.device.id,
          username: "owner",
          password: "change-me",
        }),
      })
    ).json()) as { token: string }
  ).token;
}
describe("membership HTTP", () => {
  test("cashier registers and looks up, owner controls status and discounts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kiddy-members-http-"));
    const runtime = createHostRuntime({ dataDir: dir, port: 43145 });
    runtimes.push(runtime);
    await runtime.start();
    const base = runtime.server.url;
    const owner = await httpBootstrapOwner(base);
    const cashier = await login(runtime, "Cashier", owner.token);
    const auth = {
      authorization: `Bearer ${cashier}`,
      "content-type": "application/json",
    };
    const created = (await (
      await fetch(`${base}/members`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ name: "Alya", phone: "0812345678" }),
      })
    ).json()) as { member: { id: string; code: string } };
    expect(created.member.code).toMatch(/^MEM-/);
    const found = await fetch(`${base}/members/${created.member.code}`, {
      headers: { authorization: `Bearer ${cashier}` },
    });
    expect(found.status).toBe(200);
    const ownerSession = await login(runtime, "Owner Dashboard", owner.token);
    const ownerAuth = {
      authorization: `Bearer ${ownerSession}`,
      "content-type": "application/json",
    };
    expect(
      (
        await fetch(`${base}/members/${created.member.id}/deactivate`, {
          method: "POST",
          headers: ownerAuth,
          body: JSON.stringify({ reason: "test" }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await fetch(`${base}/membership/discounts`, { headers: ownerAuth }))
        .status,
    ).toBe(200);
    expect((await fetch(`${base}/membership/discounts`, {})).status).toBe(401);
    await rm(dir, { recursive: true, force: true });
  });
});
