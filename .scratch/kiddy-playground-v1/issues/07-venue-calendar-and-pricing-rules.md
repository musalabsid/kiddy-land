# Define venue calendar and pricing rules

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: —
Map: ../map.md

## Question

What venue opening/closing, timezone, weekday/weekend calendar, ticket-package, unlimited-package, overtime, membership-discount, complimentary-ticket, and authorized-price-override rules must the system apply?

## Comments

## Answer

The v1 Venue Calendar is an operating schedule, not a booking or reservation calendar. It stores the venue timezone, one continuous opening/closing interval per day, closed days, and date-specific overrides for holidays, early closing, exceptional opening, or pricing period.

The Operating Day is the venue's local calendar date from midnight through midnight. Sales, refunds, reports, and waiting-ticket validity use that local date. Normal Ticket Package prices are selected by weekday/weekend Price Period; a date-specific holiday or exception override takes precedence.

A full closure or early closing blocks new sales and entries. Active sessions are auto-exited at the effective closing time using their existing package and deposit policy. Paid waiting tickets that could not be admitted are marked unused/voided and refunded according to the sale rules. The closure reason remains visible in the audit/report history.

Ticket Package changes affect new sales only. A completed sale snapshots its price, duration, Ticket Deposit, overtime rate, and Deposit Policy; waiting and active tickets keep the rules they were sold with.

Customer bookings, reservations, capacity slots, no-shows, and rescheduling are outside v1.
