import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { createHostRuntime } from "../src/supervisor.ts";

describe("local HTTPS listener", () => {
  test("generates a persisted self-signed cert and serves the same app over HTTPS", async () => {
    const dataDir = `/tmp/kiddy-tls-${crypto.randomUUID()}`;
    const runtime = createHostRuntime({
      dataDir,
      host: "127.0.0.1",
      port: 43137,
      httpsPort: 43138,
      tlsHosts: ["192.168.1.108"],
    });
    await runtime.start();
    try {
      expect(runtime.server.httpsUrl).toBe("https://127.0.0.1:43138");
      expect(runtime.server.tlsFingerprint).toMatch(
        /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/,
      );
      const { existsSync } = await import("node:fs");
      expect(existsSync(`${dataDir}/tls/cert.pem`)).toBe(true);
      expect(existsSync(`${dataDir}/tls/key.pem`)).toBe(true);
      // HTTP listener (desktop path) is unaffected
      const httpReady = (await (
        await fetch(runtime.server.url + "/ready")
      ).json()) as { status: string };
      expect(httpReady.status).toBe("ready");
    } finally {
      await runtime.stop();
      await rm(dataDir, { recursive: true, force: true });
      await rm(`${dataDir}-wal`, { force: true });
      await rm(`${dataDir}-shm`, { force: true });
    }
  });
});
