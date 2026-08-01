# Define sale, payment, refund, and receipt rules

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: 01
Map: ../map.md

## Question

What is the lifecycle of a Sale containing ticket and product lines, including manual payment confirmation, split or partial payment, discounts, refunds, voids, receipt contents, and the audit trail required for owner reporting?

## Comments

## Answer

A Sale may contain any combination of Ticket Lines and Product Lines, including a mixed admission-and-retail checkout. It uses one payment method—cash, QRIS, or bank transfer—and the cashier manually confirms QRIS/transfer receipt; split and partial payments are not supported in v1.

A sale becomes final only after full payment confirmation. Ticket creation, optional per-child deposit credits, inventory reduction, receipt numbering, and revenue recording complete atomically; an incomplete operation does not become revenue or issue usable tickets/products.

Each completed sale produces one numbered itemized Receipt plus one individual QR ticket for every Ticket Line. Reprints preserve the original sale and ticket identities, are visibly marked as reprints, and record the staff member, time, and reason.

Membership discounts apply only to eligible lines: the member child's ticket and products configured as eligible. Discounts do not stack. A cashier may apply a Price Override or complimentary line only with a recorded reason; the owner reviews those overrides.

A cart may be voided before completion. After completion, a cashier may issue an eligible line-level Refund with a reason. A ticket refund is allowed only before entry. A product refund records whether the item returns to sellable stock or is damaged/consumed, and inventory changes accordingly. All corrections remain in the audit history and reporting data.
