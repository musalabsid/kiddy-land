# 20 — Cashier Ticket Sale and PDF artifacts

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A Cashier can complete a Sale containing independent Ticket Lines for children, confirm one cash/QRIS/bank-transfer Payment Method, and receive the committed Receipt and Ticket artifacts. The Cashier can open/download the canonical PDFs, show a digital QR, and record print attempts without making printing part of Sale finalization.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect
- 19 — Venue calendar and Ticket Package configuration

## Acceptance criteria

- [ ] The Cashier can create one or more independent Ticket Lines, choose the effective Ticket Package, associate each line with one child, and review price/deposit details before payment.
- [ ] The Sale supports exactly one manually confirmed Payment Method: cash, QRIS, or bank transfer; split and partial payments are rejected.
- [ ] Finalization atomically creates the Sale, Receipt identity, Ticket identities, package snapshots, and any deposit records; an incomplete finalization creates none of them.
- [ ] A completed Sale exposes one numbered itemized Receipt and one individual Ticket identity per Ticket Line.
- [ ] `Print tickets` produces a combined PDF with separate child-ticket strips; `Print receipt` produces the logical 80 mm Receipt PDF; `Open/download PDF` and `Show QR` remain available independently.
- [ ] A cancelled, failed, or unknown browser/Windows print attempt never voids, duplicates, or changes the committed Sale/Tickets; explicit reprint is marked and audited.
- [ ] Duplicate submit/retry is state-aware and does not create a second Sale, Receipt, or Ticket.
