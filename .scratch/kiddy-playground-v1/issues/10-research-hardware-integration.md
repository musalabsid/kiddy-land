# Research Windows scanner and receipt integration

Status: resolved
Resolved by: main session
Type: research
Label: wayfinder:research
Blocked by: —
Map: ../map.md

## Question

Using primary documentation, what reliable v1 paths exist for QR/barcode scanning and receipt/ticket printing across a Tauri v2 Windows host and network PWA clients, and what constraints should the product specification impose?

## Comments

## Answer

The lowest-risk v1 scanning path is PWA camera capture with a maintained in-app decoder fallback. Browser `BarcodeDetector` is optional acceleration, not a compatibility guarantee. Camera access on ordinary LAN clients requires an HTTPS secure context, so the offline host deployment must provide a trusted local HTTPS origin and clear permission/error/manual-entry states.

USB scanners are optional host-attached keyboard-wedge devices, not network scanners. They remain outside the v1 smartphone strategy; if added later, the specification must define focus, suffix, keyboard layout, scan timeout, and accidental-keystroke behavior.

Phones and tablets cannot silently access a Windows thermal printer or raw ESC/POS/cash drawer. All client print requests should go through an authenticated server print-job contract and execute on the Windows host through a narrowly scoped Tauri/native printer service. V1 acceptance must name supported printer/driver classes and cover QR readability, paper/cutter errors, queue retries, and duplicate-job prevention. Browser print/PDF can remain a fallback.

Research artifact: [`research/windows-hardware-integration`](../../../../../../tmp/kiddy-research-hardware/research/windows-hardware-integration.md), commit `c970f8c`.

Research brief prepared on throwaway branch [`research/windows-hardware-integration`](../../../../../../tmp/kiddy-research-hardware/research/windows-hardware-integration.md), commit `c970f8c`. It recommends PWA camera scanning with a bundled decoder fallback and routing all network-client print jobs through a native Windows host printer service; USB scanners remain host-attached optional hardware. The findings are now incorporated into the research resolution below.
