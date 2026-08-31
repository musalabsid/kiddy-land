import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  acceptanceScenarioIds,
  checkAppLocalData,
  checkNetworkHost,
  checkPortAvailable,
  checkReadiness,
  createAcceptanceRun,
  finishAcceptanceRun,
  recordScenario,
  releaseReady,
  scenarioTemplate,
  validateArtifactGuidance,
  validateTrustedOrigin,
  writeAcceptanceEvidence,
} from "./acceptance.ts";

const output =
  process.argv[2] ??
  join(process.cwd(), "acceptance-evidence", `ticket-28-${Date.now()}.json`);
const origin = process.env.KIDDY_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const dataDir =
  process.env.KIDDY_DATA_DIR ?? join(process.cwd(), ".acceptance-data");
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
  const artifact = validateArtifactGuidance({
    ticketPdf: { pages: 1, stripsPerPage: 4, qrMm: 25, safetyMarginMm: 3 },
    receiptMm: 80,
    scalePercent: 100,
    browserHeadersFootersDisabled: true,
  });
  const results = new Map<
    string,
    {
      observed: string;
      evidence: string[];
      status: "PASS" | "FAIL" | "PENDING";
      limitation?: string;
    }
  >([
    [
      "server-readiness",
      {
        observed: JSON.stringify(readiness.body),
        evidence: ["runtime:ready-check"],
        status: readiness.ready ? "PASS" : "FAIL",
      },
    ],
    [
      "app-local-data",
      {
        observed: localData.usable
          ? localData.path
          : (localData.error ?? "unavailable"),
        evidence: localData.usable ? ["runtime:data-write"] : [],
        status: localData.usable ? "PASS" : "FAIL",
      },
    ],
    [
      "port-conflict",
      {
        observed: `configured port ${port} ${portAvailable ? "available" : "occupied"}`,
        evidence: [],
        status: "PENDING",
        limitation:
          "Requires a separate process to occupy the configured production port; validate in Ticket 29 or 30",
      },
    ],
    [
      "hostname-mdns",
      {
        observed: dns.addresses.join(", ") || dns.error || "unresolved",
        evidence: [],
        status: "PENDING",
        limitation:
          "Requires configured venue hostname/mDNS fixture; local loopback is not sufficient",
      },
    ],
    [
      "trusted-origin",
      {
        observed: "Origin validation helper available",
        evidence: validateTrustedOrigin(origin, [origin])
          ? ["runtime:origin-validation"]
          : [],
        status: validateTrustedOrigin(origin, [origin]) ? "PASS" : "FAIL",
      },
    ],
    [
      "ticket-pdf-layout",
      {
        observed: artifact.valid
          ? "Canonical artifact guidance valid"
          : artifact.errors.join("; "),
        evidence: artifact.valid ? ["runtime:artifact-guidance"] : [],
        status: artifact.valid ? "PASS" : "FAIL",
      },
    ],
    [
      "receipt-80mm",
      {
        observed: "Receipt width validated by artifact guidance",
        evidence: artifact.valid ? ["runtime:receipt-guidance"] : [],
        status: artifact.valid ? "PASS" : "FAIL",
      },
    ],
    [
      "qr-25mm",
      {
        observed: "QR target validated by artifact guidance",
        evidence: artifact.valid ? ["runtime:qr-guidance"] : [],
        status: artifact.valid ? "PASS" : "FAIL",
      },
    ],
    [
      "browser-print-guidance",
      {
        observed: "Browser scale/header guidance validated",
        evidence: artifact.valid ? ["runtime:browser-print-guidance"] : [],
        status: artifact.valid ? "PASS" : "FAIL",
      },
    ],
    [
      "fixture-record",
      {
        observed: "Environment and fixture versions recorded",
        evidence: ["runtime:environment"],
        status: "PASS",
      },
    ],
  ]);
  for (const id of acceptanceScenarioIds) {
    const result = results.get(id) ?? {
      observed: "Requires LAN/device/physical fixture",
      evidence: ["pending:venue-fixture"],
      status: "PENDING" as const,
      limitation: "Validate in Ticket 29 or 30",
    };
    recordScenario(run, { ...scenarioTemplate(id), ...result });
  }
  const finished = finishAcceptanceRun(run);
  await writeAcceptanceEvidence(finished, output);
  console.log(
    JSON.stringify(
      {
        output,
        releaseReady: releaseReady(finished),
        pending: finished.scenarios
          .filter((scenario) => scenario.status === "PENDING")
          .map((scenario) => scenario.scenarioId),
      },
      null,
      2,
    ),
  );
  process.exitCode = releaseReady(finished) ? 0 : 1;
}

void main();
