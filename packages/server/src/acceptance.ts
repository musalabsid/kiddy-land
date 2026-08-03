import { hostname, platform, release, version } from "node:os";
import { mkdir, writeFile, open, stat } from "node:fs/promises";
import { createConnection } from "node:net";
import { lookup } from "node:dns/promises";

export type AcceptanceStatus = "PASS" | "FAIL" | "PENDING";
export type FixtureVersions = Record<string, string>;
export type AcceptanceEvidence = {
  scenarioId: string;
  setup: string;
  steps: string[];
  expected: string;
  observed: string;
  evidence: string[];
  status: AcceptanceStatus;
  limitation?: string;
  at: string;
};
export type AcceptanceEnvironment = {
  os: string;
  runtime: string;
  hostname: string;
  fixtures: FixtureVersions;
};
export type AcceptanceRun = {
  id: string;
  ticket: "28";
  environment: AcceptanceEnvironment;
  scenarios: AcceptanceEvidence[];
  startedAt: string;
  finishedAt?: string;
};

export function acceptanceEnvironment(fixtures: FixtureVersions = {}): AcceptanceEnvironment {
  return { os: `${platform()} ${release()}`, runtime: `${process.release.name} ${process.version}`, hostname: hostname(), fixtures: { ...fixtures } };
}

export function createAcceptanceRun(fixtures?: FixtureVersions): AcceptanceRun {
  return { id: `acceptance-${Date.now()}`, ticket: "28", environment: acceptanceEnvironment(fixtures), scenarios: [], startedAt: new Date().toISOString() };
}

export function recordScenario(run: AcceptanceRun, input: Omit<AcceptanceEvidence, "at">): AcceptanceEvidence {
  const scenario = { ...input, at: new Date().toISOString() };
  run.scenarios.push(scenario);
  return scenario;
}

export function finishAcceptanceRun(run: AcceptanceRun): AcceptanceRun {
  return { ...run, finishedAt: new Date().toISOString() };
}

export function releaseReady(run: AcceptanceRun): boolean {
  const scenarios = new Map(run.scenarios.map((scenario) => [scenario.scenarioId, scenario]));
  return Boolean(run.finishedAt) && acceptanceScenarioIds.every((id) => {
    const scenario = scenarios.get(id);
    return scenario?.status === "PASS" && scenario.observed.trim().length > 0 && scenario.evidence.length > 0;
  });
}

export function acceptanceMarkdown(run: AcceptanceRun): string {
  const lines = [`# Ticket 28 acceptance ${run.id}`, "", `- Started: ${run.startedAt}`, `- Finished: ${run.finishedAt ?? "in progress"}`, `- OS: ${run.environment.os}`, `- Runtime: ${run.environment.runtime}`, `- Host: ${run.environment.hostname}`, "", "## Fixtures", "", ...Object.entries(run.environment.fixtures).map(([name, value]) => `- ${name}: ${value}`), "", "## Scenarios", "", ...run.scenarios.flatMap((scenario) => [`### ${scenario.scenarioId} — ${scenario.status}`, `- Setup: ${scenario.setup}`, `- Steps: ${scenario.steps.join("; ")}`, `- Expected: ${scenario.expected}`, `- Observed: ${scenario.observed}`, `- Evidence: ${scenario.evidence.join(", ") || "none"}`, ...(scenario.limitation ? [`- Limitation: ${scenario.limitation}`] : []), ""]), `Release gate: **${releaseReady(run) ? "PASS" : "FAIL"}**`, ""];
  return lines.join("\n");
}

export async function writeAcceptanceEvidence(run: AcceptanceRun, path: string): Promise<void> {
  const finished = finishAcceptanceRun(run);
  const jsonPath = path.toLowerCase().endsWith(".json") ? path : `${path}.json`;
  await writeFile(jsonPath, JSON.stringify(finished, null, 2) + "\n");
  await writeFile(jsonPath.replace(/\.json$/i, ".md"), acceptanceMarkdown(finished));
}

export async function checkReadiness(origin: string): Promise<{ status: number; ready: boolean; body: unknown }> {
  try {
    const response = await fetch(new URL("/ready", origin));
    const body = await response.json().catch(() => undefined) as { status?: string; database?: string } | undefined;
    return { status: response.status, ready: response.ok && body?.status === "ready" && body.database === "ready", body };
  } catch (error) {
    return { status: 0, ready: false, body: error instanceof Error ? error.message : String(error) };
  }
}

export function validateArtifactGuidance(input: { ticketPdf?: { pages: number; stripsPerPage: number; qrMm: number; safetyMarginMm: number }; receiptMm?: number; scalePercent?: number; browserHeadersFootersDisabled?: boolean }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.ticketPdf || input.ticketPdf.pages < 1 || input.ticketPdf.stripsPerPage !== 4 || input.ticketPdf.qrMm < 25 || input.ticketPdf.safetyMarginMm <= 0) errors.push("Ticket PDF must document pages, four strips, 25 mm QR target, and safety margins");
  if (input.receiptMm !== 80) errors.push("Receipt width must be 80 mm");
  if (input.scalePercent !== 100) errors.push("Print scale must be 100%");
  if (input.browserHeadersFootersDisabled !== true) errors.push("Browser headers and footers must be disabled");
  return { valid: errors.length === 0, errors };
}

export function validateTrustedOrigin(origin: string, allowedOrigins: string[]): boolean {
  try { return allowedOrigins.includes(new URL(origin).origin); } catch { return false; }
}

export async function checkNetworkHost(name: string): Promise<{ host: string; resolved: boolean; addresses: string[]; error?: string }> {
  try {
    const addresses = await lookup(name, { all: true });
    return { host: name, resolved: addresses.length > 0, addresses: addresses.map((address) => address.address) };
  } catch (error) {
    return { host: name, resolved: false, addresses: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export async function checkAppLocalData(dataDir: string): Promise<{ usable: boolean; path: string; error?: string }> {
  try { await mkdir(dataDir, { recursive: true }); const marker = `${dataDir}/.acceptance-write`; await writeFile(marker, "ok\n"); await stat(marker); return { usable: true, path: dataDir }; } catch (error) { return { usable: false, path: dataDir, error: error instanceof Error ? error.message : String(error) }; }
}

export async function acquireInstanceLock(path: string): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  try { const handle = await open(path, "wx"); return { acquired: true, release: async () => { await handle.close(); const { unlink } = await import("node:fs/promises"); await unlink(path).catch(() => undefined); } }; } catch { return { acquired: false, release: async () => undefined }; }
}

export async function checkPortAvailable(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => { const socket = createConnection({ port, host }); socket.once("connect", () => { socket.destroy(); resolve(false); }); socket.once("error", () => resolve(true)); });
}

export function crashLoopState(failures: number, threshold = 3): "healthy" | "recovery-required" { return failures >= threshold ? "recovery-required" : "healthy"; }

export const acceptanceScenarioIds = [
  "server-readiness", "app-local-data", "single-instance", "port-conflict", "crash-loop-recovery", "sidecar-recovery",
  "lan-loss-write-block", "reconnect-synchronization", "hostname-mdns", "ip-change", "mdns-failure", "trusted-origin", "manual-network-recovery",
  "ticket-pdf-layout", "receipt-80mm", "qr-25mm", "browser-print-guidance", "print-unknown-reprint", "pdf-fallback", "fixture-record",
] as const;

export function scenarioTemplate(id: (typeof acceptanceScenarioIds)[number]): Omit<AcceptanceEvidence, "at" | "observed" | "evidence" | "status"> {
  const descriptions: Record<typeof id, [string, string, string]> = {
    "server-readiness": ["Start the packaged Local Server", "Readiness endpoint reports ready", "Local Server is ready"],
    "app-local-data": ["Use an isolated data directory", "Runtime writes only to app-local data", "Data directory is recorded"],
    "single-instance": ["Launch the host twice", "Second launch reuses or rejects duplicate instance", "Single-instance behavior recorded"],
    "port-conflict": ["Occupy the configured port", "Host reports a safe actionable conflict", "Port conflict is actionable"],
    "crash-loop-recovery": ["Restart after repeated host failure", "Failure is visible and recovery is bounded", "Crash-loop state is visible"],
    "sidecar-recovery": ["Stop and restart the managed sidecar", "Host rebuilds readiness without data loss", "Sidecar recovery recorded"],
    "lan-loss-write-block": ["Disconnect the client from the Local Server", "Writes are blocked", "Client is read-only"],
    "reconnect-synchronization": ["Reconnect after LAN loss", "Authoritative state refreshes before writes", "Reconnect synchronized"],
    "hostname-mdns": ["Resolve the configured hostname", "Hostname resolves without bypassing trust", "Hostname resolution recorded"],
    "ip-change": ["Change host IP and reconnect", "Documented recovery path restores trusted access", "IP-change recovery recorded"],
    "mdns-failure": ["Disable mDNS", "Manual trusted hostname/IP recovery remains available", "Manual recovery recorded"],
    "trusted-origin": ["Connect from a prepared client", "Only configured trusted origin is accepted", "Origin trust recorded"],
    "manual-network-recovery": ["Use manual entry after discovery failure", "Pairing/reconnect remains safe", "Manual fallback recorded"],
    "ticket-pdf-layout": ["Generate canonical ticket PDF", "A4 four-strip layout and safety margins are preserved", "PDF layout recorded"],
    "receipt-80mm": ["Generate receipt artifact", "Logical 80 mm output is preserved", "Receipt output recorded"],
    "qr-25mm": ["Print or render ticket QR", "25 mm target and actual-size guidance are documented", "QR guidance recorded"],
    "browser-print-guidance": ["Print through the browser", "Headers/footers are disabled and scaling is 100%", "Print guidance recorded"],
    "print-unknown-reprint": ["Simulate unknown print result", "No duplicate business record; explicit reprint is available", "Print attempt recorded"],
    "pdf-fallback": ["Decline or fail physical printing", "Canonical PDF remains available", "PDF fallback recorded"],
    "fixture-record": ["Record deployment fixtures", "Versions are captured without universal claims", "Fixture versions recorded"],
  };
  const [setup, expected, observed] = descriptions[id];
  return { scenarioId: id, setup, steps: [setup], expected, limitation: undefined };
}
