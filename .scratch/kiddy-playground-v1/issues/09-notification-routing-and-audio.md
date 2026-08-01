# Define notification routing and audio behavior

Status: resolved
Resolved by: main session
Type: prototype
Label: wayfinder:prototype
Blocked by: 01, 05, 06, 07
Map: ../map.md

## Question

Which server events generate alerts, which device modes receive each alert, how are visual alerts acknowledged or muted, what sounds are configurable, and how should public areas avoid exposing child information?

## Comments

Prototype accepted by the user on throwaway branch [`prototype/notification-routing`](../../../../../../tmp/kiddy-prototype-notifications/prototypes/notification-routing/), commit `aaa09b1`. The prototype is intentionally standalone; production UI will use the shared shadcn components from `@workspace/ui`.

## Answer

The server emits notification events and the Owner configures a Notification Route for each event and Device Mode. The prototype's baseline routes are:

- **Five minutes remaining:** Cashier, Entrance Scanner, and Exit Scanner.
- **Ticket expired:** Cashier and Exit Scanner.
- **Inventory low:** Owner Dashboard.
- **Public Kiosk:** receives none of these private operational alerts.

Routes remain configurable so a venue can add or remove a recipient mode without changing business logic. Public surfaces must never receive a child's name or private operational detail; if a future public alert is needed, it uses an explicitly safe message.

Each receiving device renders a visual alert and may play a configurable local sound. Sound settings are local to the device and respect its mute state. Alerts can be acknowledged or dismissed per device without mutating the underlying server event. V1 does not use voice announcements.

Production implementation should compose the existing shared shadcn/ui package (`Card`, `Alert`, `Badge`, `Table`, `Switch`, `Slider`, `Button`, and related primitives) rather than carrying the prototype's standalone CSS into the application. Routing and acknowledgement state remain separate from rendering, with WebSocket delivery from the server.
