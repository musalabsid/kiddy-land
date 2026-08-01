# 29 — Full-day Maintainer Checklist and release gate

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A Maintainer can run one repeatable end-to-end operating-day scenario and record evidence that the implemented Kiddy Playground v1 satisfies its domain, resilience, localization, artifact, and acceptance contracts before release.

## Blocked by

- 17 — Host runtime and Local Server foundation
- 18 — Local identity, pairing, Device Modes, and reconnect
- 19 — Venue calendar and Ticket Package configuration
- 20 — Cashier Ticket Sale and PDF artifacts
- 21 — Complete Ticket and Play Session lifecycle
- 22 — Product catalog, inventory, and retail Sale Lines
- 23 — Membership and child-linked discounts
- 24 — Owner reports, live metrics, and exports
- 25 — Notification routing and local sound
- 26 — Verified Backup and Staged Restore
- 27 — Restricted Public Kiosk
- 28 — Offline Windows deployment and physical acceptance harness

## Acceptance criteria

- [ ] The checklist covers opening the venue, representative non-member/member/finite-overtime/Unlimited Tickets, mixed Ticket/Product Sales, entrance/exit, deposits, membership discounts, inventory movement, reports, exports, alerts, and Verified Backup.
- [ ] Focused checks cover duplicate scans, lost-QR recovery, invalid/expired/auto-closed Tickets, closure handling, out-of-stock authorization, Product refund dispositions, Stock Count variance approval, and audited corrections.
- [ ] Resilience checks cover LAN loss blocking writes, authoritative reconnect refresh, device revocation/logout, print-dialog failure/unknown outcome without duplicate business records, Verified Backup, and Staged Restore.
- [ ] Bilingual smoke coverage verifies core login, Ticket, Receipt, alert, Kiosk, date, and fixed-IDR behavior in Bahasa Indonesia and English.
- [ ] Each scenario records setup, steps, expected result, evidence, and PASS/FAIL status, and the release gate fails when a required scenario lacks evidence or violates a product decision.
- [ ] The final result identifies any device/media/SKU limitation as an acceptance limitation rather than silently broadening or narrowing the product contract.
