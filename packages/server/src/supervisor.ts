import { mkdir } from "node:fs/promises";
import { createLocalServer, type LocalServer, type LocalServerOptions } from "./server.ts";

export type HostDiagnostic = { state: "starting" | "ready" | "unhealthy" | "fatal"; message: string };
export type HostRuntime = { server: LocalServer; diagnostics: () => HostDiagnostic; start: () => Promise<void>; stop: (timeoutMs?: number) => Promise<void> };
let activeRuntime: HostRuntime | undefined;

export function createHostRuntime(options: LocalServerOptions): HostRuntime {
  if (activeRuntime) return activeRuntime;
  let server: LocalServer;
  let diagnostic: HostDiagnostic = { state: "starting", message: "Local Server starting" };
  const build = () => createLocalServer({ ...options, restorePrepared: async (id) => { const old = server; try { await old.stop(); await old.replacePrepared(id); server = build(); await server.start(); return { restored: id }; } catch (error) { try { server = build(); await server.start(); server.setRecoveryBlocked(true, error instanceof Error ? error.message : "Restore failed; restore the safety backup"); } catch { try { server.setRecoveryBlocked(true, error instanceof Error ? error.message : "Restore failed; restore the safety backup"); } catch {} } diagnostic = { state: "unhealthy", message: error instanceof Error ? error.message : "Restore failed; restore the safety backup" }; throw error; } } });
  server = build();
  const runtime: HostRuntime = {
    get server() { return server; },
    diagnostics: () => diagnostic,
    async start() { try { await mkdir(options.dataDir, { recursive: true }); await server.start(); diagnostic = { state: "ready", message: "Local Server ready" }; } catch { diagnostic = { state: "fatal", message: "Local Server failed to start; restore a Verified Backup" }; throw new Error(diagnostic.message); } },
    async stop(timeoutMs = 5_000) { await server.stop(timeoutMs); diagnostic = { state: "unhealthy", message: "Local Server stopped" }; if (activeRuntime === runtime) activeRuntime = undefined; },
  };
  activeRuntime = runtime; return runtime;
}
export function getActiveHostRuntime() { return activeRuntime; }
