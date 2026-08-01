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
