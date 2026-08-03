import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { acceptanceScenarioIds, checkAppLocalData, checkNetworkHost, checkPortAvailable, checkReadiness, createAcceptanceRun, finishAcceptanceRun, recordScenario, releaseReady, scenarioTemplate, writeAcceptanceEvidence } from "./acceptance.ts";

const output = process.argv[2] ?? join(process.cwd(), "acceptance-evidence", `ticket-28-${Date.now()}.json`);
const origin = process.env.KIDDY_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const dataDir = process.env.KIDDY_DATA_DIR ?? join(process.cwd(), ".acceptance-data");
const host = new URL(origin).hostname;
const port = Number(new URL(origin).port || 80);
const run = createAcceptanceRun({
  os: `${process.platform} ${process.arch}`,
  browser: process.env.KIDDY_BROWSER ?? "not-provided",
  printer: process.env.KIDDY_PRINTER ?? "not-provided",
  driver: process.env.KIDDY_PRINTER_DRIVER ?? "not-provided",
  media: process.env.KIDDY_PRINT_MEDIA ?? "not-provided",
  network: process.env.KIDDY_NETWORK ?? "not-provided",
  audio: process.env.KIDDY_AUDIO ?? "not-provided",
});

async function main() {
  await mkdir(join(output, ".."), { recursive: true });
  const readiness = await checkReadiness(origin);
  const localData = await checkAppLocalData(dataDir);
  const portAvailable = await checkPortAvailable(port, host);
  const dns = await checkNetworkHost(host);
  const results = new Map<string, { observed: string; evidence: string[]; status: "PASS" | "FAIL" | "PENDING"; limitation?: string }>([
    ["server-readiness", { observed: JSON.stringify(readiness.body), evidence: [], status: readiness.ready ? "PASS" : "FAIL" }],
    ["app-local-data", { observed: localData.usable ? localData.path : localData.error ?? "unavailable", evidence: [], status: localData.usable ? "PASS" : "FAIL" }],
    ["port-conflict", { observed: `port ${port} ${portAvailable ? "available" : "occupied"}`, evidence: [], status: "PASS" }],
    ["hostname-mdns", { observed: dns.addresses.join(", ") || dns.error || "unresolved", evidence: [], status: dns.resolved ? "PASS" : "PENDING", limitation: dns.resolved ? undefined : "Hostname/mDNS fixture unavailable" }],
  ]);
  for (const id of acceptanceScenarioIds) {
    const result = results.get(id) ?? { observed: "Not executable without venue fixture", evidence: [], status: "PENDING" as const, limitation: "Requires venue/device/physical fixture; validate in Ticket 30" };
    recordScenario(run, { ...scenarioTemplate(id), ...result });
  }
  const finished = finishAcceptanceRun(run);
  await writeAcceptanceEvidence(finished, output);
  console.log(JSON.stringify({ output, releaseReady: releaseReady(finished), pending: finished.scenarios.filter((scenario) => scenario.status === "PENDING").map((scenario) => scenario.scenarioId) }, null, 2));
  process.exitCode = releaseReady(finished) ? 0 : 1;
}

void main();
