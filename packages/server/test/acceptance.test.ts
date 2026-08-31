import { describe, expect, test } from "bun:test";

import {
  acceptanceEnvironment,
  acceptanceMarkdown,
  acceptanceScenarioIds,
  checkNetworkHost,
  checkReadiness,
  createAcceptanceRun,
  finishAcceptanceRun,
  recordScenario,
  releaseReady,
  scenarioTemplate,
  validateArtifactGuidance,
  validateTrustedOrigin,
} from "../src/acceptance.ts";

describe("cross-platform acceptance harness", () => {
  test("records complete evidence and fails incomplete runs", () => {
    const run = createAcceptanceRun({
      os: "fixture-os",
      browser: "fixture-browser",
    });
    expect(
      acceptanceEnvironment(run.environment.fixtures).fixtures.browser,
    ).toBe("fixture-browser");
    expect(releaseReady(run)).toBe(false);
    for (const id of acceptanceScenarioIds)
      recordScenario(run, {
        ...scenarioTemplate(id),
        observed: "Verified",
        evidence: [`evidence/${id}.txt`],
        status: "PASS",
      });
    const finished = finishAcceptanceRun(run);
    expect(releaseReady(finished)).toBe(true);
    expect(acceptanceMarkdown(finished)).toContain("Release gate: **PASS**");
  });

  test("readiness and DNS checks fail safely", async () => {
    const readiness = await checkReadiness("http://127.0.0.1:1");
    expect(readiness.ready).toBe(false);
    const dns = await checkNetworkHost("invalid.kiddy-land.test");
    expect(dns.resolved).toBe(false);
    expect(
      validateTrustedOrigin("https://kiddy.local", ["https://kiddy.local"]),
    ).toBe(true);
    expect(
      validateTrustedOrigin("http://evil.local", ["https://kiddy.local"]),
    ).toBe(false);
    expect(
      validateArtifactGuidance({
        ticketPdf: { pages: 1, stripsPerPage: 4, qrMm: 25, safetyMarginMm: 3 },
        receiptMm: 80,
        scalePercent: 100,
        browserHeadersFootersDisabled: true,
      }).valid,
    ).toBe(true);
  });
});
