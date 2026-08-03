# 30 — Windows installer and physical acceptance

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to validate

A Maintainer validates the packaged product on a clean offline Windows machine and records the Windows-specific and physical acceptance evidence left pending by Tickets 28 and 29. This ticket is validation-focused; it must not introduce Windows-only behavior into shared product contracts without a separate product decision.

## Blocked by

- 17–29 — product, cross-platform harness, and Ubuntu checklist

## Acceptance criteria

- [ ] A clean Windows 10/11 x64 machine with no Bun/Node and no Internet installs the offline-capable package, launches bundled WebView2, starts the self-contained sidecar, and shows readiness.
- [ ] Single-instance, app-local data, Private/Domain firewall, close-to-tray/Quit, port conflict, crash-loop, and sidecar recovery behavior are evidenced.
- [ ] Prepared Android scanner trust, QR pairing, representative scans, manual-entry recovery, permission/camera/Wi-Fi failure handling, hostname/mDNS, IP-change, mDNS failure, and trusted-origin recovery are evidenced without certificate-warning bypass.
- [ ] Ticket PDF pagination, A4 four-strip layout, trim/safety margins, fold/tape handling, target 25 mm QR readability, logical 80 mm receipts, actual-size scaling, and browser header/footer behavior are evidenced.
- [ ] If physical printing is elected, printer/driver/media scaling, clipping, queue/dialog failure, paper/cutter behavior, unknown attempts, explicit reprint, and PDF fallback are evidenced.
- [ ] Exact Windows, WebView2, browser, Android, printer, driver, media, network, and audio fixture versions are recorded.
- [ ] Any failed or unavailable fixture is recorded as a release limitation; no Windows acceptance claim is made without evidence.
