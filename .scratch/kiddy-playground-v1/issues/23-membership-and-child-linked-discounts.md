# 23 — Membership and child-linked discounts

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A Cashier can register and identify a Member belonging to one Child, apply configured Ticket/Product eligibility during checkout, preserve membership history, and handle deactivation or lost-card reissue without changing completed Sales.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect
- 19 — Venue calendar and Ticket Package configuration
- 20 — Cashier Ticket Sale and PDF artifacts

## Acceptance criteria

- [ ] Cashier can register one active Member identity for one Child during checkout or in a Membership flow and receive a unique membership code.
- [ ] A Member can be found by code or verified name/phone lookup, and a lost card can be reissued without changing Member identity or history.
- [ ] Configured membership discounts apply only to eligible Ticket/Product Lines, do not stack, and are visible before payment confirmation.
- [ ] A normal non-member Ticket/Product Sale remains fully usable.
- [ ] Deactivation blocks future membership discounts while preserving Child, Member, visit, Sale, and Ticket history; reactivation is supported.
- [ ] Completed Sale snapshots preserve the applied discount and do not change when membership configuration changes later.
- [ ] Membership-linked events and history are available for Owner reporting.
