import { mkdir } from "node:fs/promises";
import { createLocalServer, type LocalServer, type LocalServerOptions } from "./server.ts";

export type HostDiagnostic = {
  state: "starting" | "ready" | "unhealthy" | "fatal";
  message: string;
};

export type HostRuntime = {
  server: LocalServer;
  diagnostics: () => HostDiagnostic;
  start: () => Promise<void>;
  stop: (timeoutMs?: number) => Promise<void>;
};

let activeRuntime: HostRuntime | undefined;

export function createHostRuntime(options: LocalServerOptions): HostRuntime {
  if (activeRuntime) return activeRuntime;
  const server = createLocalServer(options);
  let diagnostic: HostDiagnostic = { state: "starting", message: "Local Server starting" };
  const runtime: HostRuntime = {
    server,
    diagnostics: () => diagnostic,
    async start() {
      try {
        await mkdir(options.dataDir, { recursive: true });
        await server.start();
        diagnostic = { state: "ready", message: "Local Server ready" };
      } catch {
        diagnostic = { state: "fatal", message: "Local Server failed to start" };
        throw new Error("Local Server failed to start");
      }
    },
    async stop(timeoutMs = 5_000) {
      await server.stop(timeoutMs);
      diagnostic = { state: "unhealthy", message: "Local Server stopped" };
      if (activeRuntime === runtime) activeRuntime = undefined;
    },
  };
  activeRuntime = runtime;
  return runtime;
}

export function getActiveHostRuntime() { return activeRuntime; }
