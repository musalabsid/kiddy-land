# Define v1 acceptance scenarios

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 15
Map: ../map.md

## Question

Which end-to-end scenarios prove that one venue can run a full day offline through the cashier, scanners, POS, memberships, inventory, reports, notifications, backup, and recovery workflows?

## Comments

## Answer

V1 acceptance is a repeatable full-day story plus focused checks, maintained in the repository rather than dependent on a business-owner sign-off.

The full-day story covers opening the venue, mixed ticket/product sales, the representative ticket matrix, entrance and exit scans, live alerts, membership discounts, deposits, inventory movement, daily reports, CSV/PDF export, and a Verified Backup. The ticket matrix includes: a non-member who exits on time; a member who receives a discount and deposit refund; a finite ticket with overtime and a remainder due; an Unlimited Package; and separate duplicate/lost-QR recovery checks.

POS/inventory checks cover stock reduction, low-stock alerts, a blocked zero-stock sale, an Owner-authorized out-of-stock exception, product refund with return-to-stock or damaged/consumed outcome, and approved Stock Count variance.

The critical resilience matrix covers LAN loss blocking writes, authoritative refresh after reconnect, duplicate scans producing no duplicate state, immediate device revocation/logout, printer failure/retry without duplicate tickets, Verified Backup creation, and Staged Restore. Bilingual smoke coverage verifies core UI, login, ticket, receipt, alert, kiosk, date, and fixed-IDR formatting in both Bahasa Indonesia and English without duplicating the entire day twice.

Acceptance evidence is a Maintainer Checklist: automated type/lint/test/build checks plus manual LAN/phone/device runs, screenshots, receipts, and server logs where relevant. Each scenario records setup, steps, expected result, evidence, and PASS/FAIL status so any maintainer or contributor can repeat it.

The checklist also owns the exact deployment and physical-output fixtures that the product map intentionally leaves open. Before a fixture is called supported, acceptance must name and exercise the offline Windows 10/11 x64 install/WebView2 payload, host/OS/build, app-local paths, Private/Domain firewall, sidecar recovery, the venue-owned prepared Android scanner/browser/CA-trust path, and the local router/AP, stable hostname/mDNS, IP-change, and mDNS-failure recovery behavior. It must separately verify the PDF-canonical output: A4 landscape four-strip ticket pagination, compact logical 80 mm receipt output, 100%/actual-size print guidance, browser headers/footers, QR readability after the venue's fold/tape/media handling, and no receipt QR. If the venue elects physical printing, its printer model/driver/paper/queue behavior is an acceptance fixture; native/direct printing is not a v1 dependency. Print checks must prove that a completed transaction remains correct through dialog cancellation, failure/unknown outcome, explicit reprint marking, duplicate-job prevention, and PDF/digital-QR fallback. If an optional USB keyboard-wedge scanner is included, its model, keyboard layout, suffix, focus, timeout, and accidental-keystroke behavior are part of the fixture. These SKU, driver, CA, and media choices are release acceptance work; they do not change the PDF/artifact contract or v1 business rules.
