# 29 — Ubuntu full-day Maintainer Checklist and release gate

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A Maintainer can run one repeatable end-to-end operating-day scenario on Ubuntu and record evidence that the implemented Kiddy Playground v1 satisfies its domain, resilience, localization, artifact, and acceptance contracts. This ticket deliberately excludes Windows installer/WebView2/firewall/driver acceptance, which belongs to Ticket 30.

## Blocked by

- 17–27 — implemented product and Local Server tickets
- 28 — Cross-platform deployment and acceptance harness

## Acceptance criteria

- [ ] The Ubuntu checklist covers opening the venue, representative non-member/member/finite-overtime/Unlimited Tickets, mixed Ticket/Product Sales, entrance/exit, deposits, membership discounts, inventory movement, reports, exports, alerts, and Verified Backup.
- [ ] Focused checks cover duplicate scans, lost-QR recovery, invalid/expired/auto-closed Tickets, closure handling, out-of-stock authorization, Product refund dispositions, Stock Count variance approval, and audited corrections.
- [ ] Resilience checks cover LAN loss blocking writes, authoritative reconnect refresh, device revocation/logout, print-dialog failure/unknown outcome without duplicate business records, Verified Backup, and Staged Restore.
- [ ] Bilingual smoke coverage verifies core login, Ticket, Receipt, alert, Kiosk, date, and fixed-IDR behavior in Bahasa Indonesia and English.
- [ ] Each scenario records setup, steps, expected result, evidence, and PASS/FAIL status, and the Ubuntu release gate fails when a required scenario lacks evidence or violates a product decision.
- [ ] The final result identifies any device/media/SKU limitation as an acceptance limitation rather than silently broadening or narrowing the product contract.
- [ ] Windows-specific scenarios are listed as pending Ticket 30 evidence and do not silently pass the Ubuntu gate.
