# 28 — Cross-platform deployment and acceptance harness

Status: ready-for-agent
Label: ready-for-agent
Type: task
Map: ../map.md

## What to build

Build the cross-platform deployment and acceptance harness used by the Ubuntu and Windows validation tickets. The implementation must expose repeatable diagnostics, fixture/version recording, readiness checks, packaging hooks, network checks, artifact checks, and evidence output without assuming Windows APIs at runtime. This slice preserves the PDF-canonical/browser-print baseline; it does not implement native/direct printer dispatch.

Operating-system-specific validation is intentionally split out:
- Ticket 29 runs the product and operational checklist on Ubuntu.
- Ticket 30 validates the Windows installer, WebView2, firewall, printer, and physical acceptance requirements.

## Blocked by

- 17 — Host runtime and Local Server foundation
- 18 — Local identity, pairing, Device Modes, and reconnect
- 20 — Cashier Ticket Sale and PDF artifacts
- 21 — Complete Ticket and Play Session lifecycle
- 22 — Product catalog, inventory, and retail Sale Lines
- 27 — Restricted Public Kiosk

## Acceptance criteria

- [ ] The harness runs on Ubuntu and Windows without requiring Bun/Node/Internet on the target machine beyond the packaged application path.
- [ ] It provides machine-readable and human-readable evidence records with scenario ID, setup, OS/runtime, fixture versions, steps, expected result, observed result, evidence references, and PASS/FAIL status.
- [ ] It checks Local Server readiness, app-local data, single-instance behavior, port conflicts, crash-loop handling, sidecar recovery, and safe write blocking through platform-neutral interfaces.
- [ ] It checks LAN loss, reconnect synchronization, hostname/mDNS resolution, IP-change handling, mDNS failure, trusted-origin configuration, and manual recovery paths without certificate-warning bypass.
- [ ] It validates canonical ticket/receipt artifact metadata and print guidance, including pagination, A4 four-strip layout, safety margins, target 25 mm QR guidance, logical 80 mm receipt output, actual-size scaling, and disabled browser headers/footers.
- [ ] It records optional physical printer/media fixtures and supports explicit reprint, unknown print-attempt outcomes, and PDF fallback without implementing native/direct printer dispatch.
- [ ] It has no hard-coded Windows-only assumptions in shared checks; Windows-only checks are declared as Ticket 30 scenarios.
- [ ] Exact device, OS, browser, printer, driver, media, network, and audio fixture versions are recorded as acceptance evidence rather than treated as universal product guarantees.
