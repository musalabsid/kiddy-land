# Kiddy Playground v1 — Wayfinding Map

Status: open
Type: map
Label: wayfinder:map

## Destination

Produce a build-ready v1 specification and phased implementation plan for one physical playground that can run its full daily operation offline from one Windows host and local network: one-child ticketing and play sessions, POS and inventory, memberships and deposits, reports, administration, device modes, notifications, and the supporting packaging, recovery, and acceptance rules.

## Notes

- **Domain:** single-venue playground operations.
- **Primary source material:** [`specs/spec.md`](../../specs/spec.md) and [`specs/srs-kiddy-land.pdf`](../../specs/srs-kiddy-land.pdf).
- **Skills to consult:** `domain-modeling`, `grilling`, `research`, `prototype`, `codebase-design`, `shadcn`, `vercel-react-best-practices`, and `tdd` when implementation begins.
- **Standing architecture preference:** one repository, one embedded server, one SQLite database, server-owned business logic, local-network clients, and no Internet dependency for normal operation.
- **Confirmed baseline before map creation:** v1 targets one venue and one Windows host; each child receives an independent ticket; a play session starts at entrance scan; payments are recorded manually as cash, QRIS, or bank transfer; members belong to one child; public kiosks are paired restricted devices; daily reports total sales by method/date/cashier with refunds and voids; owners configure weekday/weekend ticket packages, including an unlimited package that runs until exit or closing; five-minute alerts are visual plus configurable local sound.
- **Planning posture:** this map produces decisions and a handoff-ready route, not the implementation itself. Open child tickets are the current frontier; decisions belong in their resolutions.

## Decisions so far

- [Define the ticket and play-session lifecycle](issues/01-ticket-and-session-lifecycle.md) — one child/one visit; waiting tickets expire at closing, entry starts one session, exit settles overtime, and closing auto-exits unresolved sessions.
- [Define sale, payment, refund, and receipt rules](issues/02-sale-payment-and-receipt-rules.md) — mixed ticket/product sales use one manually confirmed payment, atomic completion, individual QR tickets, auditable cashier corrections, and stock-aware product refunds.
- [Define membership and deposit accounting](issues/03-membership-and-deposit-accounting.md) — optional one-child memberships have configurable line discounts; deposits belong to tickets and follow package-level refund, forfeiture, or unlimited-cap policies.
- [Define product, barcode, and inventory behavior](issues/04-product-and-inventory-behavior.md) — products are independent integer-stock SKUs with optional unique barcodes, approved stock counts/intake, per-product alerts, guarded out-of-stock sales, and preserved price history.

## Not yet specified

- Role permissions, device-mode assignment, staff accountability, and public-kiosk privacy boundaries.
- Local-network discovery, pairing lifecycle, host/network failure handling, and the meaning of client reconnects.
- Reporting definitions, business-day boundaries, operating hours, and the owner dashboard's live metrics.
- Printer/scanner integration, server packaging, desktop supervision, backup/restore, and deployment acceptance.
- The concrete interaction design for cashier, entrance, exit, inventory, kiosk, and owner workflows.

## Out of scope

- Multi-branch or cloud-coordinated operation in v1.
- Client-side transaction queues and later conflict resolution while disconnected from the local server.
- Payment-provider verification or gateway integration; QRIS and bank transfer are manually recorded methods in v1.
- Redundant local hosts and automatic server failover in v1.
- Voice announcements, unless a later decision redraws the destination; v1 uses visual alerts and configurable local sound.
- Birthday booking, remote owner access, and other future-expansion features not needed for one venue's daily operation.
