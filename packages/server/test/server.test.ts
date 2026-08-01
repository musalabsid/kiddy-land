import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { createHostRuntime } from "../src/supervisor.ts";

const runtimes: Array<Awaited<ReturnType<typeof createHostRuntime>>> = [];

afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.stop();
});

describe("Local Server contract", () => {
  test("reports readiness after persistence preflight", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kiddy-server-"));
    const runtime = createHostRuntime({ dataDir, port: 43127 });
    runtimes.push(runtime);
    await runtime.start();
    expect(runtime.diagnostics().state).toBe("ready");
    expect(runtime.server.health().database).toBe("ready");
    const response = await fetch(runtime.server.url + "/ready");
    expect(response.status).toBe(200);
    await rm(dataDir, { recursive: true, force: true });
  });

  test("returns the same runtime when launched twice", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kiddy-server-"));
    const first = createHostRuntime({ dataDir, port: 43128 });
    const second = createHostRuntime({ dataDir, port: 43128 });
    expect(second).toBe(first);
    await first.stop();
    await rm(dataDir, { recursive: true, force: true });
  });
});
