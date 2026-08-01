# Kiddy Playground Domain

This context defines the language for a single-venue playground's daily operations: admissions, play sessions, retail sales, memberships, and staff workflows.

## Admissions and play

**Child**:
The individual who uses the playground. A child is the subject of a playground visit and can have a membership relationship.

**Playground Ticket**:
Permission for one child to use the playground for one visit under a defined included duration and deposit. Each ticket has its own identity and exactly one entry/exit lifecycle; a second visit requires a new ticket.
_Avoid_: Group ticket, family ticket (unless a future product explicitly introduces those as separate concepts)

**Play Session**:
The timed period of playground use that begins when a valid ticket is admitted by an entry scan and ends when that ticket exits. A ticket may be sold and remain waiting before its play session starts.

**Sale**:
A counter purchase that may contain one or more independent Playground Tickets and/or retail product lines, with one payment method, receipt, and audit history. A mixed sale is allowed.
_Avoid_: Group ticket, transaction (when referring to the customer-facing purchase)

**Ticket Line**:
The admission portion of a Sale that creates one independent Playground Ticket for one child.

**Product Line**:
The retail portion of a Sale that records a product and quantity.

**Receipt**:
The numbered customer-facing record of a completed Sale. A mixed Sale has one receipt and each Ticket Line also produces an individual QR ticket.

**Void**:
Cancellation of an unpaid or not-yet-finalized sale or cart. A void does not become revenue.

**Refund**:
A reversal of an eligible line from a completed Sale. It records the staff member and reason; product refunds also record whether the item returned to stock or was damaged/consumed.

**Price Override**:
A manual replacement of a configured line price or a complimentary line, permitted to a cashier only with a recorded reason. It does not stack with an automatic membership discount.

**Ticket Package**:
An owner-configured admission option with a named included duration, weekday and weekend prices, and an overtime rate. A package may also define unlimited included time.

**Deposit Policy**:
The Ticket Package rule that determines how a Ticket Deposit is settled: return unused remainder, forfeit it when overtime occurs, or cap/upgrade the charge to an unlimited-package price.

**Overtime**:
Play time used after a ticket's included duration has elapsed. Overtime is calculated for that ticket's play session and becomes an amount to settle. If the deposit does not cover it, the remaining amount stays due until collected or explicitly waived.

**Unlimited Package**:
A ticket package with no overtime clock during the venue's opening hours. The child still has an exit lifecycle, and any unresolved session is auto-exited at closing according to the venue's closing policy.

**Outstanding Charge**:
The portion of a settled charge that remains due after applying an available deposit. It must be collected or explicitly waived before the ticket's financial settlement is complete.

**Ticket Deposit**:
A temporary amount attached to one Ticket Line as security for overtime. It is settled when that ticket exits according to the Ticket Package's Deposit Policy and does not become reusable member credit.

**Payment Method**:
The method staff records for settling a sale: cash, QRIS, or bank transfer. In v1 it describes a confirmed payment; the system does not verify the external payment provider.

## Products and inventory

**Product**:
A single sellable SKU with a name, optional unique barcode, current price, integer stock quantity, and active or archived status. Size, flavor, or other variants are separate Products.

**Stock Intake**:
An auditable increase in a Product's quantity recorded for a supplier delivery or other receipt of goods, without a supplier purchasing workflow.

**Stock Count**:
A physical count of a Product that produces a variance against system quantity and requires approval before changing inventory.

**Low-Stock Threshold**:
A per-Product minimum quantity that triggers an owner alert when stock reaches or falls below the threshold.

## People and access

**Member**:
An optional registered membership for one child, identified by a unique membership code and eligible for the playground's configured benefits such as ticket/product discounts and visit history. A child may buy tickets without being a Member; registration can happen separately or during checkout.
_Avoid_: Family account (unless a future product introduces it explicitly)

**Staff User**:
An authenticated person operating the system. Access is controlled by the user's role.

**Device Mode**:
The operational role assigned to a connected client, such as cashier, entrance scanner, exit scanner, public kiosk, inventory, or owner dashboard.

**Paired Device**:
A connected client that has been approved by an owner or staff user and given a restricted device identity for its assigned mode. A public kiosk uses pairing instead of retaining staff credentials.

**Playtime Alert**:
A server-generated notice that a finite play session has five minutes remaining. In v1 it is routed to configured device modes as a visual alert with a configurable local sound; it does not require voice announcement.

**Daily Sales Report**:
A report of sales and revenue for a selected period, including totals by payment method, date, and cashier, with refunds and voids represented separately.
