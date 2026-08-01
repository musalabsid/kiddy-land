# 22 — Product catalog, inventory, and retail Sale Lines

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

Owner, Inventory Staff, and Cashier can operate Product/SKU inventory through one vertical retail path: configure a Product, receive/count stock, sell it as a Product Line in a mixed Sale, and correct a product sale with an auditable refund disposition.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect
- 20 — Cashier Ticket Sale and PDF artifacts

## Acceptance criteria

- [ ] Owner can create, archive, and reactivate Products with optional unique barcode, price, integer stock, and Low-Stock Threshold.
- [ ] Inventory Staff can record auditable Stock Intake and submit Stock Count variance; approval is required before a variance changes system quantity.
- [ ] Cashier can find Products by barcode, SKU, or name and add a Product Line to a Ticket Sale without changing the one-payment rule.
- [ ] A committed Product Line reduces stock atomically; a normal sale cannot make stock negative.
- [ ] An Owner-authorized out-of-stock exception requires a reason and creates a visible inventory exception.
- [ ] A Product refund records whether the item returns to sellable stock or is damaged/consumed, with the corresponding stock result.
- [ ] Price changes affect future Sales only; completed Product Lines preserve price, discount, and total snapshots.
- [ ] Low-stock and inventory movement events are observable by the Owner workflow and later notification/report slices.
