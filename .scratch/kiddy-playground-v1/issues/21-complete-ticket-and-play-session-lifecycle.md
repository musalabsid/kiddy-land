# 21 — Complete Ticket and Play Session lifecycle

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

Staff can take a committed Ticket through entrance, active play, overtime or Unlimited behavior, exit settlement, duplicate/lost-QR recovery, and venue closing. Entrance and Exit Scanner modes remain scan-first and use the Local Server as the authority for every state transition.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect
- 19 — Venue calendar and Ticket Package configuration
- 20 — Cashier Ticket Sale and PDF artifacts

## Acceptance criteria

- [ ] A valid Waiting Ticket starts exactly one Play Session at the first valid entrance scan; repeated entry scans return existing state without mutation.
- [ ] Active, Completed, Voided, Expired, unknown, and already-admitted scans show safe next actions rather than creating a second visit.
- [ ] A finite session calculates Overtime from its snapshotted Package rules, while an Unlimited Package does not accrue Overtime during opening hours.
- [ ] The first valid exit ends the Play Session and records the deterministic Deposit Policy result; a duplicate exit returns the existing result without another charge.
- [ ] Any Outstanding Charge remains visible until collected or explicitly waived through an authorized correction path; Exit Scanner cannot alter the calculated amount or perform a general refund/override.
- [ ] Lost-QR recovery verifies the child/Member, reissues the same Ticket identity, and never creates a second visit.
- [ ] At effective closing, unresolved Active sessions auto-close through closing and Waiting Tickets are handled according to closure/refund rules.
- [ ] The session emits the events later used by five-minute/expired notifications and Owner live metrics.
