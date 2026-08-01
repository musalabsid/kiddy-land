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
An owner-configured admission option with a named included duration, weekday and weekend prices, an overtime rate, a Ticket Deposit, and a Deposit Policy. A package may also define unlimited included time; its price and rules are snapshotted when sold.

**Venue Calendar**:
The operating schedule for one venue, not a booking calendar. It contains per-day continuous opening hours, the venue timezone, and date-specific open/closed or pricing overrides.

**Operating Day**:
The venue's local calendar date from midnight through midnight, used for sales, reports, and ticket validity.

**Closure**:
A full-day closure or early closing exception. It blocks new sales and entries, auto-closes active sessions at the effective close, and refunds paid waiting tickets that could not be admitted.

**Price Period**:
The calendar classification used to choose a Ticket Package price, normally weekday or weekend, with a date-specific holiday/exception override taking precedence.

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

**Local Server**:
The authoritative server hosted by the Windows venue computer. It owns business rules, SQLite data, authentication, and real-time events; connected clients do not create transactions without it.

**Connection State**:
The client-visible condition of its link to the Local Server. A disconnected client may show its shell or last safe view, but cannot perform writes until it reconnects and refreshes authoritative state.

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
An authenticated person operating the system. Access is controlled by the user's fixed Role, and a staff session is attributed to the paired Device it uses.

**Role**:
A fixed v1 permission set assigned to a Staff User: Owner, Cashier, or Staff. The model should be extensible toward custom roles later without making custom role composition a v1 feature.

**Device Mode**:
The operational context assigned to a connected client, such as Cashier, Entrance Scanner, Exit Scanner, Inventory, Public Kiosk, or Owner Dashboard. It selects the workflow and client scope; it does not replace server-side Role authorization.

**Device Enrollment**:
A one-time, short-lived QR invitation that registers a client with the local server and assigns its device identity and mode. It is not a permanent role credential and can be revoked by the Owner.

**Paired Device**:
A connected client that has been approved by the Owner and given a restricted device identity for its assigned mode. Private devices require a Staff User login after enrollment; a Public Kiosk uses its restricted device credential without staff credentials.

**Playtime Alert**:
A server-generated notice that a finite play session has five minutes remaining. In v1 it is routed to configured device modes as a visual alert with a configurable local sound; it does not require voice announcement.

**Notification Route**:
The configured relationship between a server event and the Device Modes that receive it. A route may exclude Public Kiosk or replace private child information with a safe public message.

**Alert Acknowledgement**:
A per-device action that marks a delivered alert as seen or dismisses it without changing the underlying server event. Sound mute is local to the receiving device.

**Daily Sales Report**:
A report of sales and revenue for a selected period, including totals by payment method, date, and cashier, with refunds and voids represented separately. It distinguishes business revenue from deposit cash movements.

**Occupancy**:
The number of tickets with an active Play Session at a point in time. V1 reports active sessions rather than capacity percentages.

**Revenue**:
Ticket prices, Product Lines, and settled Overtime. Refunds reduce revenue; refundable Ticket Deposits are not revenue when received.

**Deposit Cash Flow**:
Cash received, returned, forfeited, or applied from Ticket Deposits, reported separately from Revenue so the same money is not counted twice.

**Audited Correction**:
A later refund, adjustment, or correction that preserves the original record and records the staff member, timestamp, reason, and resulting net value.

**Report Export**:
A CSV or PDF representation of a filtered report, including its selected period and generation time.
