import { describe, expect, test } from "bun:test";

import { createAcceptanceRun, finishAcceptanceRun } from "../src/acceptance.ts";
import {
  recordUbuntuScenario,
  ubuntuReleaseReady,
  ubuntuScenarioIds,
  ubuntuScenarioTemplate,
} from "../src/ubuntu-acceptance.ts";

describe("Ubuntu full-day acceptance gate", () => {
  test("fails until every required scenario has evidence", () => {
    const run = createAcceptanceRun({ os: "linux test" });
    recordUbuntuScenario(run, ubuntuScenarioIds[0], {
      observed: "verified",
      evidence: ["opening.txt"],
      status: "PASS",
    });
    const finished = finishAcceptanceRun(run);
    expect(ubuntuReleaseReady(finished)).toBe(false);
  });

  test("passes a complete evidenced checklist", () => {
    const run = createAcceptanceRun({ os: "linux test" });
    for (const id of ubuntuScenarioIds)
      recordUbuntuScenario(run, id, {
        observed: "verified",
        evidence: [`${id}.txt`],
        status: "PASS",
      });
    const finished = finishAcceptanceRun(run);
    expect(ubuntuReleaseReady(finished)).toBe(true);
    expect(ubuntuScenarioTemplate("venue-opening").scenarioId).toBe(
      "ubuntu-venue-opening",
    );
  });
});
