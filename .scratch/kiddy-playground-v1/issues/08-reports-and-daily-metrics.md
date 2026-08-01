# Define reports and daily operating metrics

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: 01, 02, 03, 04, 07
Map: ../map.md

## Question

Which daily sales, revenue, payment-method, ticket, occupancy, overtime, inventory, membership, and cashier metrics must reports and the live owner dashboard show, and how are business-day boundaries and corrections handled?

## Comments

## Answer

V1 provides Operations + Financial reporting for the Owner, without becoming a full accounting suite.

- **Financial:** sales, ticket/product/overtime revenue, payment-method totals, cashier activity, refunds, voids, Price Overrides, and separate Ticket Deposit cash movements.
- **Playground:** current active Play Sessions as Occupancy, entries, exits, auto-closed sessions, overtime, and ticket/package activity. Occupancy is the count of active sessions, not a capacity percentage.
- **Inventory:** current stock, Stock Intakes, approved Stock Counts/variances, product movements, archived products, and Low-Stock Threshold alerts.
- **Membership:** active/deactivated member counts, visits, eligible discounts, and membership-linked ticket history.

Operational events—active sessions, Occupancy, five-minute alerts, low stock, and connected-device state—update live through server WebSocket events. Historical reports query the server and refresh when filters change; they are not implemented as polling.

Reports use the venue's local timezone and midnight-to-midnight Operating Day. Revenue includes ticket prices, Product Lines, and settled Overtime; refundable Ticket Deposits are shown as separate cash flow and are not double-counted as revenue. Refunds and later corrections are Audited Corrections that preserve original activity, reason, staff, timestamp, and net result.

The Owner can filter reports by date range and relevant dimensions such as cashier, payment method, package, product, and member status, then export the filtered view as CSV or PDF. Cashiers see only their own current-day summary and ticket count; the Owner sees the complete report set.
