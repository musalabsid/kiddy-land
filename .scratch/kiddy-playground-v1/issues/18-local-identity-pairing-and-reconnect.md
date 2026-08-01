# 18 — Local identity, pairing, Device Modes, and reconnect

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

An Owner can enroll local clients with a short-lived QR invitation, assign a Device Mode, and revoke a Paired Device. Private devices require Staff User login; Public Kiosk uses restricted credentials. All HTTP and WebSocket access is authorized by the Local Server, and a disconnected client becomes read-only until it refreshes authoritative state after reconnect.

## Blocked by

- 17 — Host runtime and Local Server foundation

## Acceptance criteria

- [ ] The Owner can display a one-time enrollment QR containing the trusted local origin and a short-lived token, and a client can pair exactly once from it.
- [ ] A private Paired Device requires Username/password login and records Staff User, Paired Device, and Device Mode on mutations.
- [ ] A Public Kiosk can pair without staff credentials and receives only its restricted public capability set.
- [ ] The effective permission result is the intersection of Role and Device Mode; denied commands do not mutate state.
- [ ] Revoking a device invalidates its credential, closes active sessions/WebSockets, and requires fresh enrollment.
- [ ] Loss of the Local Server or LAN shows a clear disconnected state, disables all mutations, and never queues a transaction; reconnect refreshes authoritative state before writes return.
- [ ] Authenticated WebSocket connections enforce the same identity and origin rules as HTTP commands.
