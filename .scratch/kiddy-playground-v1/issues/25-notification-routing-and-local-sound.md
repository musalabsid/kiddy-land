# 25 — Notification routing and local sound

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

The server emits operational events and the Owner can route them to Device Modes. Receiving devices show visual alerts and may play configurable local sound without exposing private Child/Member information on Public Kiosks.

## Blocked by

- 18 — Local identity, pairing, Device Modes, and reconnect
- 21 — Complete Ticket and Play Session lifecycle
- 22 — Product catalog, inventory, and retail Sale Lines

## Acceptance criteria

- [ ] Five-minute remaining, Ticket expired, Inventory low, and connected-device events can be routed by configured Device Mode.
- [ ] The baseline routes reach Cashier/Entrance/Exit Scanner for five-minute/expired events and Owner Dashboard for low-stock events, while Public Kiosk receives none of these private alerts.
- [ ] A receiving device shows an alert without taking over the current workflow and can acknowledge/dismiss it locally without mutating the underlying business event.
- [ ] Sound is configurable and muteable per device; visual alert state remains available when sound is disabled or unavailable.
- [ ] Public surfaces never receive a Child name or private operational detail; any future public message would require an explicitly safe route.
- [ ] WebSocket reconnect/revocation does not deliver stale or unauthorized alerts.
