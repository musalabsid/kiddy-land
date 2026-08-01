# Research embedded server packaging and local discovery

Status: open
Type: research
Label: wayfinder:research
Blocked by: —
Map: ../map.md

## Question

Using primary documentation, how should a Tauri v2 Windows application supervise an embedded Hono/TypeScript server with SQLite and WebSocket support, expose it to local-network clients, discover the host, and remain operable without Internet access?

## Comments

Research brief prepared on throwaway branch [`research/embedded-server-architecture`](../../../../../../tmp/kiddy-research-server/research/embedded-server-architecture.md), commit `b1f1ce2`. It recommends a supervised Node/Hono Tauri sidecar, host-only SQLite, one HTTP/WebSocket origin, and mDNS plus QR/numeric-IP fallbacks. The ticket remains open until the findings are incorporated into a route decision.
