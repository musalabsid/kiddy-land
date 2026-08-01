# 24 — Owner reports, live metrics, and exports

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

An Owner can inspect the venue's financial, playground, inventory, and membership activity from authoritative report views, see current operational metrics, filter by relevant dimensions, and export the filtered result as CSV or PDF.

## Blocked by

- 20 — Cashier Ticket Sale and PDF artifacts
- 21 — Complete Ticket and Play Session lifecycle
- 22 — Product catalog, inventory, and retail Sale Lines
- 23 — Membership and child-linked discounts

## Acceptance criteria

- [ ] Financial reporting shows Sales, Ticket/Product/Overtime revenue, payment-method totals, Cashier activity, refunds, voids, Price Overrides, and separate Ticket Deposit cash movements.
- [ ] Revenue excludes refundable Ticket Deposits and reflects Audited Corrections without rewriting original activity.
- [ ] Playground reporting shows current Occupancy as Active Play Sessions, entries, exits, auto-closed sessions, Overtime, and Package activity.
- [ ] Inventory reporting shows current stock, Stock Intake, approved Stock Count variances, Product movements, archived Products, and Low-Stock alerts.
- [ ] Membership reporting shows active/deactivated Members, visits, eligible discounts, and membership-linked Ticket history.
- [ ] Owner can filter by local Operating Day/date range and relevant Cashier, Payment Method, Package, Product, and Member dimensions.
- [ ] CSV/PDF exports identify the selected period and generation time and reflect the filtered authoritative view.
- [ ] Live metrics update from authenticated server events, while historical report views refresh from authoritative queries rather than client-only state.
