import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  checkAppLocalData,
  checkReadiness,
  createAcceptanceRun,
  finishAcceptanceRun,
  validateTrustedOrigin,
  writeAcceptanceEvidence,
} from "./acceptance.ts";
import {
  recordUbuntuScenario,
  ubuntuReleaseReady,
  ubuntuScenarioIds,
  type UbuntuScenarioId,
} from "./ubuntu-acceptance.ts";

const output =
  process.argv[2] ??
  join(process.cwd(), "acceptance-evidence", `ticket-29-${Date.now()}.json`);
const origin = process.env.KIDDY_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const dataDir =
  process.env.KIDDY_DATA_DIR ?? join(process.cwd(), ".ubuntu-acceptance-data");

const run = createAcceptanceRun({
  os: `${process.platform} ${process.arch}`,
  browser: process.env.KIDDY_BROWSER ?? "not-provided",
  network: process.env.KIDDY_NETWORK ?? "loopback-only",
  audio: process.env.KIDDY_AUDIO ?? "not-provided",
});

const pending = (id: UbuntuScenarioId, limitation: string) =>
  recordUbuntuScenario(run, id, {
    observed: "Not executed by the platform-neutral runner",
    evidence: [],
    status: "PENDING",
    limitation,
  });

async function main() {
  await mkdir(join(output, ".."), { recursive: true });

  const readiness = await checkReadiness(origin);
  recordUbuntuScenario(run, "venue-opening", {
    observed: readiness.ready
      ? "Local Server ready"
      : JSON.stringify(readiness.body),
    evidence: readiness.ready ? ["runtime:ready-check"] : [],
    status: readiness.ready ? "PASS" : "FAIL",
  });

  const localData = await checkAppLocalData(dataDir);
  recordUbuntuScenario(run, "verified-backup", {
    observed: localData.usable
      ? `Acceptance data directory usable: ${localData.path}`
      : (localData.error ?? "unavailable"),
    evidence: localData.usable ? ["runtime:data-write"] : [],
    status: "PENDING",
    limitation:
      "Backup verification itself must be exercised through the backup workflow.",
  });

  recordUbuntuScenario(run, "bilingual-smoke", {
    observed: "Bahasa Indonesia and English are declared application locales",
    evidence: ["contract:localization-scope"],
    status: "PENDING",
    limitation: "Visual bilingual smoke remains a maintainer step.",
  });

  recordUbuntuScenario(run, "lan-loss-write-block", {
    observed: "Server exposes write-blocking health contract",
    evidence: ["contract:health-writeBlocked"],
    status: "PENDING",
    limitation:
      "Client LAN disconnect and reconnect must be exercised with a second device.",
  });

  recordUbuntuScenario(run, "device-revocation", {
    observed: `Trusted origin: ${validateTrustedOrigin(origin, [origin])}`,
    evidence: validateTrustedOrigin(origin, [origin])
      ? ["runtime:origin-validation"]
      : [],
    status: "PENDING",
    limitation:
      "Device credential revocation remains an authenticated workflow step.",
  });

  for (const id of ubuntuScenarioIds) {
    if (
      run.scenarios.some((scenario) => scenario.scenarioId === `ubuntu-${id}`)
    )
      continue;
    pending(
      id,
      "Execute this business/resilience workflow in the Ubuntu Maintainer Checklist with real API/UI evidence.",
    );
  }

  const finished = finishAcceptanceRun(run);
  await writeAcceptanceEvidence(finished, output);
  console.log(
    JSON.stringify(
      {
        output,
        releaseReady: ubuntuReleaseReady(finished),
        pending: finished.scenarios
          .filter((scenario) => scenario.status === "PENDING")
          .map((scenario) => scenario.scenarioId),
      },
      null,
      2,
    ),
  );
  process.exitCode = ubuntuReleaseReady(finished) ? 0 : 1;
}

void main();
