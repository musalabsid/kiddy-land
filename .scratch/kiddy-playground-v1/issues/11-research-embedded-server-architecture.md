# Research embedded server packaging and local discovery

Status: resolved
Resolved by: main session
Type: research
Label: wayfinder:research
Blocked by: —
Map: ../map.md

## Question

Using primary documentation, how should a Tauri v2 Windows application supervise an embedded Hono/TypeScript server with SQLite and WebSocket support, expose it to local-network clients, discover the host, and remain operable without Internet access?

## Comments

## Answer

The recommended v1 packaging is a self-contained Node.js Hono server bundled as a Tauri external binary/sidecar and supervised by the Rust host. Tauri starts exactly one sidecar, supplies its app-data path and port, waits for an explicit readiness signal, exposes lifecycle/diagnostic state, and performs bounded graceful shutdown/restart. The server owns SQLite and serves the desktop UI, LAN PWA, HTTP API, and WebSocket endpoint from one origin; LAN clients never open the SQLite file directly.

SQLite remains exclusively on the Windows host because network filesystem access and WAL are unsafe for this architecture. The host advertises a DNS-SD/mDNS identity when ready, while QR and numeric-IP URLs remain deterministic fallbacks. Windows Firewall/private-network policy, browser local-network permissions, and offline HTTPS certificates are deployment risks that require installer and clean-machine acceptance tests.

Hono's current Node WebSocket path uses the Node server adapter and `ws`; authentication and origin checks must apply to WebSocket connections as well as HTTP. The server must use a per-user application-data directory, a single-instance guard, readiness/health diagnostics, credential-safe logs, and a crash-loop policy that does not blindly restart on database/schema failures.

Research artifact: [`research/embedded-server-architecture`](../../../../../../tmp/kiddy-research-server/research/embedded-server-architecture.md), commit `b1f1ce2`.

Residual product decisions remain for the later packaging/deployment ticket: supported browser matrix, fixed versus dynamic port, whether hosting continues after the Tauri window closes, mDNS service naming, and installer permission/firewall behavior.

Research brief prepared on throwaway branch [`research/embedded-server-architecture`](../../../../../../tmp/kiddy-research-server/research/embedded-server-architecture.md), commit `b1f1ce2`. It recommends a supervised Node/Hono Tauri sidecar, host-only SQLite, one HTTP/WebSocket origin, and mDNS plus QR/numeric-IP fallbacks. The findings are now incorporated into the research resolution below.
