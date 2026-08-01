# 19 — Venue calendar and Ticket Package configuration

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

An Owner can configure the venue's Operating Day, local schedule, closures, Price Periods, finite Ticket Packages, Unlimited Packages, overtime, Ticket Deposits, and Deposit Policies. The server applies the configured schedule to new operating actions and exposes a clear configuration result in the Owner workflow.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect

## Acceptance criteria

- [ ] The Owner can set venue timezone, per-day opening/closing interval, closed days, and date-specific open/closed or pricing overrides.
- [ ] The system derives Operating Day using the venue's local calendar date and displays the effective schedule used for a requested date.
- [ ] The Owner can configure finite and Unlimited Packages with included duration, weekday/weekend or override price, overtime rate, Ticket Deposit, and Deposit Policy.
- [ ] Full closure and early closing prevent new operating actions that are outside the effective schedule and provide the configured closure reason.
- [ ] New sales use the effective Price Period/override while future configuration changes do not alter already-snapshotted Package rules.
- [ ] Owner-only configuration changes are authenticated, audited, and visible in the appropriate language and IDR formatting.
