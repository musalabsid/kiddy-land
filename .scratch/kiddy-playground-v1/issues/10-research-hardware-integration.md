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

The lowest-risk v1 scanning path is PWA camera capture on venue-owned, maintainer-prepared Android devices using the trusted local HTTPS origin, with a maintained in-app decoder fallback. Browser `BarcodeDetector` is optional acceleration, not a compatibility guarantee. Camera access requires a secure context and permission. Unmanaged phones, iOS, and other uncertified browsers remain manual-entry/future-certification paths, with clear permission/error/manual-entry states.

USB scanners are optional host-attached keyboard-wedge devices, not network scanners. They remain outside the v1 smartphone strategy and are not a product dependency; if an optional fixture is shipped or accepted, the specification must define focus, suffix, keyboard layout, scan timeout, and accidental-keystroke behavior.

The pulled printables research resolves the product path as **PDF-canonical artifact-first with visible Windows/browser printing for v1**. The Local Server commits the Sale/Tickets first and renders immutable versioned Receipt and Ticket PDFs from their snapshots; HTML/preview may use the same contract. `Print tickets` uses a combined batch PDF with separate child-ticket strips, while `Print receipt` uses the compact logical 80 mm PDF. PDF/open/download and digital QR presentation are required fallbacks and a printer driver/queue is not a daily-operation dependency. Phones and tablets must not silently access a Windows printer. Native/direct host printing is deferred unless venue throughput or ergonomics acceptance proves the visible print flow inadequate; any later adapter must consume the same artifact and audited print-attempt/idempotency model. Printing or a cancelled/unknown print outcome never creates, voids, or duplicates business records. Reprints preserve the original identity, are visibly marked, and record actor, time, and reason. V1 acceptance must cover PDF pagination/scaling, QR readability on the actual media, print-dialog outcomes, duplicate prevention, and physical printer behavior where the venue elects physical output.

Research artifact: [`research/windows-hardware-integration`](../../../../../../tmp/kiddy-research-hardware/research/windows-hardware-integration.md), commit `c970f8c`.

Research brief prepared on throwaway branch [`research/windows-hardware-integration`](../../../../../../tmp/kiddy-research-hardware/research/windows-hardware-integration.md), commit `c970f8c`. It recommends PWA camera scanning with a bundled decoder fallback and identifies a native Windows host printer service as a possible controlled integration. The later printables research and issue 16 make the product choice to launch with PDF-canonical artifacts and visible browser/WebView printing; the native service remains a deferred trigger, not a v1 dependency. USB scanners remain optional host-attached hardware.
