# 28 — Offline Windows deployment and physical acceptance harness

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

A Maintainer can validate a clean, offline Windows deployment and the venue's prepared scanner, network, PDF/browser-print, media, and optional physical-printer fixtures through a repeatable acceptance harness. This slice preserves the PDF-canonical/browser-print baseline; it does not implement native/direct printer dispatch.

## Blocked by

- 17 — Host runtime and Local Server foundation
- 18 — Local identity, pairing, Device Modes, and reconnect
- 20 — Cashier Ticket Sale and PDF artifacts
- 21 — Complete Ticket and Play Session lifecycle
- 22 — Product catalog, inventory, and retail Sale Lines
- 27 — Restricted Public Kiosk

## Acceptance criteria

- [ ] A clean Windows 10/11 x64 machine with no Node and no Internet can install the offline-capable package, launch WebView2 from the bundled payload, start the sidecar, and show readiness.
- [ ] Single-instance, app-local data, Private/Domain firewall, close-to-tray/Quit, port conflict, crash-loop, and sidecar recovery behavior are evidenced.
- [ ] A venue-owned prepared Android scanner can trust the canonical hostname/CA, pair by QR, scan representative QRs in venue conditions, recover to manual entry, and safely handle permission/camera/Wi-Fi failures.
- [ ] mDNS/hostname, IP-change, mDNS failure, and trusted Windows-desktop recovery behavior are tested without certificate-warning bypass.
- [ ] Ticket PDF pagination, A4 four-strip layout, trim/safety margins, fold/tape handling, target 25 mm QR readability, receipt logical 80 mm output, 100%/actual-size guidance, and disabled browser headers/footers are evidenced.
- [ ] If the venue elects physical printing, the selected printer/driver/media fixture is tested for scaling, clipping, queue/dialog failure, paper/cutter behavior where applicable, unknown attempts, explicit reprint, and PDF fallback.
- [ ] Exact device, OS, browser, printer, driver, media, network, and audio fixture versions are recorded as acceptance evidence rather than treated as universal product guarantees.
