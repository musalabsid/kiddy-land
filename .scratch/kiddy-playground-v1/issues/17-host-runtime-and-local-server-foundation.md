# 17 — Host runtime and Local Server foundation

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A venue Owner can launch the Windows host application and see one healthy Local Server ready for local operation. The host supervises one self-contained Node/Hono sidecar and one host-only SQLite database, exposes a bounded readiness/health result, and shuts down safely. This is the first vertical slice and establishes the Local Server application interface that all later workflows use.

## Blocked by

None — can start immediately.

## Acceptance criteria

- [ ] The host starts exactly one Local Server and does not start a second sidecar or database handle when launched twice.
- [ ] The Local Server creates/opens its app-local data area, runs its database preflight, binds its configured HTTPS/API/WebSocket origin, and reports readiness only after the health contract succeeds.
- [ ] The host displays starting, ready, unhealthy, and fatal diagnostic states without exposing credentials or customer data in logs.
- [ ] The host remains usable without Internet access and stores mutable data outside the installation directory and network shares.
- [ ] Closing the main window can leave the service available; explicit Quit/Stop performs bounded graceful shutdown and records an incomplete-shutdown diagnostic if the deadline is exceeded.
- [ ] Contract tests exercise the Local Server application interface through observable health/readiness and persistence behavior, not private implementation details.
