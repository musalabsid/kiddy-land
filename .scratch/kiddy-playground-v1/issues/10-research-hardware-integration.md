# Research Windows scanner and receipt integration

Status: open
Type: research
Label: wayfinder:research
Blocked by: —
Map: ../map.md

## Question

Using primary documentation, what reliable v1 paths exist for QR/barcode scanning and receipt/ticket printing across a Tauri v2 Windows host and network PWA clients, and what constraints should the product specification impose?

## Comments

Research brief prepared on throwaway branch [`research/windows-hardware-integration`](../../../../../../tmp/kiddy-research-hardware/research/windows-hardware-integration.md), commit `c970f8c`. It recommends PWA camera scanning with a bundled decoder fallback and routing all network-client print jobs through a native Windows host printer service; USB scanners remain host-attached optional hardware. The ticket remains open until the findings are incorporated into a route decision.
