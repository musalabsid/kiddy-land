# 27 — Restricted Public Kiosk

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A paired Public Kiosk can perform the two restricted public checks needed by the venue: validate a Ticket/show remaining time and scan a Product/show its public price. It stays safe and useful without a Staff User login while exposing no private or financial operations.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect
- 20 — Cashier Ticket Sale and PDF artifacts
- 21 — Complete Ticket and Play Session lifecycle
- 22 — Product catalog, inventory, and retail Sale Lines

## Acceptance criteria

- [ ] A paired Public Kiosk can validate a Ticket and show the safe public result and remaining time without exposing private history or deposit details.
- [ ] A paired Public Kiosk can scan/search a Product and show its public price without exposing stock, cost, membership, or sales controls.
- [ ] The kiosk has no Staff User login, membership lookup, sale/payment/refund action, report, inventory mutation, or Owner configuration access.
- [ ] Kiosk requests are restricted by server authorization even if the client is manipulated.
- [ ] Connection loss, revocation, and expiry return the kiosk to a clear safe idle/reconnect state without stale private data.
- [ ] Kiosk language/device fallback and IDR formatting follow the localization decisions.
