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

The recommended v1 packaging is a self-contained Bun Hono server bundled as a Tauri external binary/sidecar and supervised by the Rust host. Tauri starts exactly one sidecar, supplies its app-data path and port, waits for an explicit readiness signal, exposes lifecycle/diagnostic state, and performs bounded graceful shutdown/restart. The server owns SQLite and serves the desktop UI, LAN PWA, HTTP API, and WebSocket endpoint from one origin; LAN clients never open the SQLite file directly.

SQLite remains exclusively on the Windows host because network filesystem access and WAL are unsafe for this architecture. The host advertises a DNS-SD/mDNS identity when ready; the enrollment QR carries the canonical trusted hostname and one-time token, while numeric-IP URLs are a trusted Windows-desktop recovery diagnostic only. Windows Firewall/private-network policy, prepared-device trust provisioning, browser local-network permissions, and offline HTTPS certificates are deployment risks that require installer and clean-machine acceptance tests.

Hono's current Node WebSocket path uses the Node server adapter and `ws`; authentication and origin checks must apply to WebSocket connections as well as HTTP. The server must use a per-user application-data directory, a single-instance guard, readiness/health diagnostics, credential-safe logs, and a crash-loop policy that does not blindly restart on database/schema failures.

Research artifact: [`research/embedded-server-architecture`](../../../../../../tmp/kiddy-research-server/research/embedded-server-architecture.md), commit `b1f1ce2`.

The product-level deployment defaults are now frozen in issue 16: use a self-contained Windows x64 Bun sidecar with an offline-capable WebView2 installer, host-only app-local SQLite/data, a stable fixed HTTPS port (current proposed default `43117`) that fails visibly if occupied, close-to-tray hosting with explicit Quit/Stop, Private/Domain firewall access, and a per-venue trusted HTTPS hostname/CA for prepared Android scanners. The enrollment QR is canonical-hostname plus one-time token; numeric IP is a trusted Windows-desktop recovery path only, not a phone-camera certificate bypass. Printer readiness must not gate server readiness because v1 uses PDF/browser printing and native/direct printing is deferred. Exact browser/OS/device/SKU matrix, certificate provisioning evidence, mDNS service label/network behavior, installer privilege/signing/update policy, and clean-machine evidence remain deployment acceptance or venue-policy work rather than open ticket/sale behavior.

Research brief prepared on throwaway branch [`research/embedded-server-architecture`](../../../../../../tmp/kiddy-research-server/research/embedded-server-architecture.md), commit `b1f1ce2`. It recommends a supervised Node/Hono Tauri sidecar, host-only SQLite, and one HTTP/WebSocket origin. Its general mDNS plus QR/numeric-IP fallback is refined by the later packaging/TLS decision: the canonical trusted origin is the prepared-device hostname, while numeric-IP recovery is for the trusted Windows desktop only and never a phone certificate-warning bypass.
