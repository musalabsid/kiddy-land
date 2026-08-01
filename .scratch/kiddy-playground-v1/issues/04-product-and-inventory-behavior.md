# Define product, barcode, and inventory behavior

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: —
Map: ../map.md

## Question

What product identity, barcode, unit, stock adjustment, inventory-count, low-stock, negative-stock, discontinuation, and product-sale rules must v1 support?

## Comments

## Answer

Each sellable item is one Product/SKU with an integer stock quantity. Sizes, flavors, colors, and other variants are separate products. A barcode is optional but, when present, must be unique; cashier search by SKU or name remains available for products without barcodes.

Normal sales cannot reduce stock below zero. An owner-authorized exception may allow an out-of-stock sale, but it requires a reason and creates a visible inventory exception. Completed sales reduce stock atomically; product refunds choose whether the item returns to sellable stock or is recorded as damaged/consumed.

New goods enter through an auditable Stock Intake with product, quantity, date, and optional cost/reference. Physical inventory uses a Stock Count: the system shows the variance and an owner or authorized approver must approve the reason before the system quantity changes.

Each Product may define its own Low-Stock Threshold. Reaching or falling below it alerts the owner dashboard; v1 does not create purchase orders or automatic reorders.

Discontinued products are archived rather than deleted. Archived products disappear from normal POS selection but retain sale, receipt, and inventory history and may be reactivated.

Product price changes affect future sales only. Completed Product Lines preserve the price, discount, and total snapshot used at the time of sale.
