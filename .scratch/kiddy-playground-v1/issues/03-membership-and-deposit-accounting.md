# Define membership and deposit accounting

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: 01, 02
Map: ../map.md

## Question

How are a child's membership, discount eligibility, deposit balance, top-ups, deductions, refunds, visit history, expiry, and insufficient balance handled across ticket and product sales?

## Comments

## Answer

Membership is optional. A child may buy and use a normal ticket without membership. Registration can happen in a dedicated Membership flow or during checkout, and creates one active Member identity per child with a unique code. Cashiers identify a member by scanning the code, with verified phone/name lookup as fallback. A lost card is reissued with the same identity so history is preserved.

Membership has no automatic expiry. An owner or authorized staff user may deactivate it; deactivation blocks future membership discounts but preserves the child, visit history, sale records, and existing ticket lifecycles. Reactivation is possible.

V1 has one membership type. The owner configures eligibility and the discount amount per Ticket Package and Product. Only eligible lines receive the member discount, and discounts never stack with one another or with a Price Override. Membership benefits do not apply retroactively.

Deposits are per-ticket security deposits, not reusable member balances. A Ticket Line may add an optional deposit amount; it is used only for overtime and cannot pay for products. The Ticket Package owns the Deposit Policy, which is configurable per package:

- **Refund remainder:** return the unused deposit in cash; apply only the actual overtime amount, then collect any amount beyond the deposit.
- **Forfeit on overtime:** return the full deposit when there is no overtime; keep the full deposit when any overtime occurs.
- **Upgrade to unlimited:** when overtime occurs, keep the deposit and cap the total ticket charge at the configured Unlimited Package price; when there is no overtime, return the deposit in cash.

The exit flow records the deposit outcome and any cash payout separately from the Sale. Product purchases are never paid from a deposit. Member history records the ticket, discount, and deposit events without retaining a reusable deposit balance.
