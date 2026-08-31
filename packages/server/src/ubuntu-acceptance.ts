import type { AcceptanceEvidence, AcceptanceRun } from "./acceptance.ts";
import { finishAcceptanceRun, recordScenario } from "./acceptance.ts";

export const ubuntuScenarioIds = [
  "venue-opening",
  "non-member-ticket",
  "member-ticket-discount",
  "unlimited-ticket",
  "finite-overtime",
  "entrance-exit",
  "deposit-settlement",
  "mixed-sale",
  "inventory-movement",
  "reports-exports",
  "operational-alerts",
  "verified-backup",
  "duplicate-scan",
  "lost-qr-recovery",
  "invalid-expired-ticket",
  "closure-handling",
  "out-of-stock-authorization",
  "product-refund",
  "stock-count-variance",
  "audited-corrections",
  "lan-loss-write-block",
  "reconnect-synchronization",
  "device-revocation",
  "unknown-print-reprint",
  "staged-restore",
  "bilingual-smoke",
] as const;

export type UbuntuScenarioId = (typeof ubuntuScenarioIds)[number];

const descriptions: Record<UbuntuScenarioId, [string, string, string]> = {
  "venue-opening": [
    "Open the venue for an operating day",
    "Opening succeeds with the configured schedule",
    "Venue opening is recorded",
  ],
  "non-member-ticket": [
    "Sell a non-member finite ticket",
    "Ticket and payment are committed",
    "Non-member sale is recorded",
  ],
  "member-ticket-discount": [
    "Sell a member ticket linked to one child",
    "Configured discount is applied",
    "Member sale is recorded",
  ],
  "unlimited-ticket": [
    "Sell an Unlimited Ticket",
    "Ticket remains valid until exit or closing",
    "Unlimited ticket is recorded",
  ],
  "finite-overtime": [
    "Exit a finite ticket after included duration",
    "Overtime is calculated from the package snapshot",
    "Overtime settlement is recorded",
  ],
  "entrance-exit": [
    "Scan a ticket at entrance and exit",
    "One play session opens and closes",
    "Session lifecycle is recorded",
  ],
  "deposit-settlement": [
    "Settle a ticket deposit at exit",
    "Deposit policy determines refund or forfeiture",
    "Deposit outcome is recorded",
  ],
  "mixed-sale": [
    "Complete one ticket and product sale",
    "One confirmed payment commits both lines",
    "Mixed sale is recorded",
  ],
  "inventory-movement": [
    "Sell and receive a product",
    "Stock movements and balance are correct",
    "Inventory movement is recorded",
  ],
  "reports-exports": [
    "Open reports and export a filtered view",
    "Report totals and export are available",
    "Report evidence is recorded",
  ],
  "operational-alerts": [
    "Trigger an operational alert",
    "Visual alert and configured local sound route correctly",
    "Alert evidence is recorded",
  ],
  "verified-backup": [
    "Create a Verified Backup",
    "Snapshot passes integrity verification",
    "Backup evidence is recorded",
  ],
  "duplicate-scan": [
    "Scan the same ticket twice",
    "Duplicate scan does not create a second session",
    "Duplicate handling is recorded",
  ],
  "lost-qr-recovery": [
    "Recover a ticket using its human-readable code",
    "Authorized recovery finds the ticket",
    "Recovery evidence is recorded",
  ],
  "invalid-expired-ticket": [
    "Scan an invalid or expired ticket",
    "Admission is rejected without mutation",
    "Rejection evidence is recorded",
  ],
  "closure-handling": [
    "Attempt an operating action during closure",
    "Action is rejected with the configured reason",
    "Closure evidence is recorded",
  ],
  "out-of-stock-authorization": [
    "Sell an out-of-stock product",
    "Sale is blocked unless Owner exception is authorized",
    "Stock guard evidence is recorded",
  ],
  "product-refund": [
    "Refund a product with a disposition",
    "Stock returns or remains consumed per disposition",
    "Refund evidence is recorded",
  ],
  "stock-count-variance": [
    "Approve a Stock Count variance",
    "Variance requires authorization and is audited",
    "Stock count evidence is recorded",
  ],
  "audited-corrections": [
    "Apply an authorized sale correction",
    "Correction preserves the original and records actor/reason",
    "Correction evidence is recorded",
  ],
  "lan-loss-write-block": [
    "Disconnect the client from the Local Server",
    "Mutations are blocked while disconnected",
    "Read-only state is recorded",
  ],
  "reconnect-synchronization": [
    "Reconnect after LAN loss",
    "Authoritative state refreshes before writes",
    "Reconnect evidence is recorded",
  ],
  "device-revocation": [
    "Revoke a paired device",
    "Credential and active sessions become invalid",
    "Revocation evidence is recorded",
  ],
  "unknown-print-reprint": [
    "Simulate an unknown print result",
    "Sale is unchanged and explicit reprint remains available",
    "Print-attempt evidence is recorded",
  ],
  "staged-restore": [
    "Restore a Verified Backup in staging",
    "Restore is checked before becoming active",
    "Restore evidence is recorded",
  ],
  "bilingual-smoke": [
    "Run core workflows in Bahasa Indonesia and English",
    "Core labels, dates, alerts, and IDR output remain usable",
    "Bilingual evidence is recorded",
  ],
};

export function ubuntuScenarioTemplate(
  id: UbuntuScenarioId,
): Omit<AcceptanceEvidence, "at" | "observed" | "evidence" | "status"> {
  const [setup, expected] = descriptions[id];
  return {
    scenarioId: `ubuntu-${id}`,
    setup,
    steps: [setup],
    expected,
    limitation: undefined,
  };
}

export function recordUbuntuScenario(
  run: AcceptanceRun,
  id: UbuntuScenarioId,
  result: Pick<AcceptanceEvidence, "observed" | "evidence" | "status"> &
    Partial<Pick<AcceptanceEvidence, "limitation">>,
) {
  return recordScenario(run, { ...ubuntuScenarioTemplate(id), ...result });
}

export function ubuntuReleaseReady(run: AcceptanceRun): boolean {
  if (!run.finishedAt) return false;
  const scenarios = new Map(
    run.scenarios.map((scenario) => [scenario.scenarioId, scenario]),
  );
  return ubuntuScenarioIds.every((id) => {
    const scenario = scenarios.get(`ubuntu-${id}`);
    return (
      scenario?.status === "PASS" &&
      scenario.observed.trim().length > 0 &&
      scenario.evidence.length > 0
    );
  });
}

export function finishUbuntuAcceptance(run: AcceptanceRun): AcceptanceRun {
  return finishAcceptanceRun(run);
}
