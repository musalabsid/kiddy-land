# Define the ticket and play-session lifecycle

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: —
Map: ../map.md

## Question

What exact states and transitions govern a Playground Ticket and its Play Session from sale through entry, active play, exit, overtime, cancellation, expiry, lost-ticket recovery, duplicate scans, and venue closing? The result must make finite and unlimited packages operationally unambiguous.

## Comments

## Answer

A Playground Ticket represents one child and one visit. Its lifecycle is:

- **Waiting:** sold and valid until venue closing; the play timer has not started. An unused waiting ticket expires at closing.
- **Active:** the first valid entry scan starts exactly one Play Session. A second entry scan is state-aware and does not mutate anything.
- **Overtime:** a finite session continues after its included duration and emits one five-minute warning when the remaining time crosses five minutes. Unlimited packages do not accrue overtime during opening hours.
- **Exit settlement:** the first valid exit scan ends the session. Available deposit is applied to overtime; any remainder becomes an Outstanding Charge that must be collected or explicitly waived before financial settlement is complete.
- **Completed:** after exit and settlement. A second exit scan returns the existing state without creating another charge.
- **Auto-closed:** an active ticket without an exit scan is exited automatically at venue closing, with overtime calculated through closing and a system-generated flag. An authorized user may correct or refund it with an audited reason.
- **Voided:** a waiting ticket may be cancelled/refunded before entry. Active or completed tickets are not normally reversible; corrections require authorization and an audit reason.

A lost QR is recovered by verifying the child or member, locating the existing ticket, and reissuing the same ticket identity; no second visit is created. A second visit always requires a new ticket.
