import { mkdir, writeFile } from "node:fs/promises";
import { serve, type ServerType } from "@hono/node-server";
import type { HealthReport } from "./app.ts";
import { createApp } from "./app.ts";
import { createIdentityStore, type IdentityStore } from "./identity.ts";

export type LocalServerOptions = {
  dataDir: string;
  host?: string;
  port?: number;
  schemaVersion?: number;
  identity?: IdentityStore;
};

export type LocalServer = {
  app: ReturnType<typeof createApp>;
  health: () => HealthReport;
  start: () => Promise<void>;
  stop: (timeoutMs?: number) => Promise<void>;
  url: string;
};

function now() { return Date.now(); }

async function preflightDatabase(path: string) {
  // The sidecar uses its packaged SQLite adapter in production. This marker is
  // intentionally only a contract fixture until the database package lands.
  await writeFile(path, "SQLite\n", { flag: "a" });
}

export function createLocalServer(options: LocalServerOptions): LocalServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 43117;
  const schemaVersion = options.schemaVersion ?? 1;
  const startedAt = now();
  let status: HealthReport["status"] = "starting";
  let database: HealthReport["database"] = "unhealthy";
  let httpServer: ServerType | undefined;
  const health = (): HealthReport => ({ status, service: "local-server", schemaVersion, database, uptimeMs: Math.max(0, now() - startedAt) });
  const identity = options.identity ?? createIdentityStore();
  const app = createApp(health, identity);

  return {
    app, health, url: `http://${host}:${port}`,
    async start() {
      if (status === "ready") return;
      await mkdir(options.dataDir, { recursive: true });
      await writeFile(`${options.dataDir}/.local-server`, "ready\n", { flag: "a" });
      await preflightDatabase(`${options.dataDir}/kiddy-land.sqlite`);
      database = "ready";
      await new Promise<void>((resolve, reject) => {
        try {
          httpServer = serve({ fetch: app.fetch, hostname: host, port }, (info) => {
            if (info.port !== port) return reject(new Error(`Local Server bound unexpected port ${info.port}`));
            status = "ready"; resolve();
          });
        } catch (error) { status = "fatal"; reject(error); }
      });
    },
    async stop(timeoutMs = 5_000) {
      if (!httpServer) return;
      status = "starting";
      const server = httpServer; httpServer = undefined;
      await Promise.race([new Promise<void>((resolve) => server.close(() => resolve())), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
      database = "unhealthy";
    },
  };
}
