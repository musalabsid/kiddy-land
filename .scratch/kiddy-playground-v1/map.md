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
- [Define roles and device-mode permissions](issues/05-roles-and-device-permissions.md) — fixed extensible roles govern server access; one-time QR enrollment assigns device modes, private devices require staff login, and kiosks receive only public ticket/price lookup.
- [Define local-network, pairing, and reconnect behavior](issues/06-local-network-and-pairing-behavior.md) — QR-first enrollment with mDNS/IP fallback, host-authoritative writes, immediate device revocation, offline HTTPS, and read-only reconnect behavior keep local clients safe.
- [Define venue calendar and pricing rules](issues/07-venue-calendar-and-pricing-rules.md) — an operating-only calendar uses per-day hours, local midnight business days, date overrides, closure refunds, and package snapshots applied to new sales only.
- [Define reports and daily operating metrics](issues/08-reports-and-daily-metrics.md) — Owner reports cover financial and operational domains; live metrics use WebSocket events, revenue excludes refundable deposits, corrections stay audited, and views export to CSV/PDF.
- [Define notification routing and audio behavior](issues/09-notification-routing-and-audio.md) — configurable server-event routes deliver visual/local-sound alerts to operational modes, keep private details off kiosks, and use shadcn components in production.
- [Prototype the daily operating workflows](issues/13-operational-workflow-prototype.md) — Variant A's Counter command center is the primary desktop direction, while scanners stay focused on scan-first workflows and production UI uses shadcn components.
- [Define language and localization scope](issues/15-language-and-localization-scope.md) — v1 supports Bahasa Indonesia and English with Indonesian default, per-user/device fallback, localized outputs, and fixed IDR currency.
- [Define v1 acceptance scenarios](issues/14-v1-acceptance-scenarios.md) — a repeatable Maintainer Checklist proves a full operating day, representative ticket/POS outcomes, resilience, bilingual smoke coverage, and evidence-backed PASS/FAIL results.
- [Research Windows scanner and receipt integration](issues/10-research-hardware-integration.md) — camera scanning needs offline HTTPS and a decoder fallback; printing belongs to the Windows host service, while USB scanners remain optional and host-attached.
- [Research embedded server packaging and local discovery](issues/11-research-embedded-server-architecture.md) — package Hono as a supervised Node sidecar, keep SQLite host-only, serve one authenticated origin, and use mDNS plus QR/IP fallback with Windows/firewall acceptance work.
- [Define backup, restore, and recovery behavior](issues/12-backup-restore-and-recovery.md) — daily and on-demand Verified Backups, retention-safe storage, Owner-only Staged Restore, integrity-failure guidance, and CSV/PDF analysis exports protect one-host operation.

## Not yet specified

- Hardware model acceptance, server packaging, desktop supervision, and clean-machine deployment details.
- The concrete interaction design for cashier, entrance, exit, inventory, kiosk, and owner workflows.

## Out of scope

- Multi-branch or cloud-coordinated operation in v1.
- Client-side transaction queues and later conflict resolution while disconnected from the local server.
- Payment-provider verification or gateway integration; QRIS and bank transfer are manually recorded methods in v1.
- Redundant local hosts and automatic server failover in v1.
- Voice announcements, unless a later decision redraws the destination; v1 uses visual alerts and configurable local sound.
- Birthday booking, remote owner access, and other future-expansion features not needed for one venue's daily operation.
