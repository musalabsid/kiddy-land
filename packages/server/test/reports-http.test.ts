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
describe("reports HTTP", () => {
  test("requires Owner and serves JSON plus exports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kiddy-reports-http-"));
    const runtime = createHostRuntime({ dataDir: dir, port: 43146 });
    runtimes.push(runtime);
    await runtime.start();
    const base = runtime.server.url;
    expect((await fetch(`${base}/reports/financial`)).status).toBe(403);
    const owner = await httpBootstrapOwner(base);
    const headers = { authorization: `Bearer ${owner.token}` };
    const report = await fetch(
      `${base}/reports/financial?from=2024-01-01&to=2024-01-01`,
      { headers },
    );
    expect(report.status).toBe(200);
    expect((await report.json()).filters).toMatchObject({
      from: "2024-01-01",
      to: "2024-01-01",
    });
    const csv = await fetch(
      `${base}/reports/financial.csv?from=2024-01-01&to=2024-01-01`,
      { headers },
    );
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const pdf = await fetch(
      `${base}/reports/financial.pdf?from=2024-01-01&to=2024-01-01`,
      { headers },
    );
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toContain("application/pdf");
    await rm(dir, { recursive: true, force: true });
  });
});
