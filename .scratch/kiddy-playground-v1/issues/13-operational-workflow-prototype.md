# Prototype the daily operating workflows

Status: resolved
Resolved by: main session
Type: prototype
Label: wayfinder:prototype
Blocked by: 01, 02, 04, 05, 06, 07, 09, 10
Map: ../map.md

## Question

What should the concrete cashier, entrance scanner, exit scanner, inventory, public kiosk, and owner-dashboard workflows look and feel like across desktop, phone, and tablet sizes?

## Comments

Prototype accepted by the user on throwaway branch [`prototype/daily-operating-workflows`](../../../../../../tmp/kiddy-prototype-workflows/prototypes/daily-operating-workflows/), commit `52c730e`. The user selected **Variant A — Counter command center** as the primary daily operating direction. Production UI should be rebuilt with shared shadcn/ui components; the prototype's standalone CSS is not production code.

## Answer

Use Variant A as the primary desktop/Cashier surface: a focused cashier workspace with mixed-sale checkout, quick ticket/product selection, current-sale cart, live operational metrics, alert acknowledgement, and a visible list of children currently playing. Keep the visual hierarchy centered on the next counter action rather than a broad administrative dashboard.

The prototype also establishes the surrounding workflow constraints: ticket/product sales share one checkout, active sessions remain visible while the cashier works, server alerts surface without taking over the whole screen, and specialized scanner modes remain focused on scan-first operations rather than copying the cashier layout. The remaining acceptance ticket will turn these flows into end-to-end scenarios.
