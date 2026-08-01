# Hardware and Windows Packaging — Fog Working Note

Status: fog-resolution draft (working note, NOT a resolved ticket)
Type: fog
Label: wayfinder:fog
Map: ../map.md

## Status & Scope

This note graduates the first remaining fog slice from the map's "Not yet specified" list into a sharp, decision-ready draft: **hardware model acceptance and Windows host packaging/deployment** (server supervision, installer, discovery, network/security, printer acceptance, clean-machine acceptance). It consolidates the research draft at `.pi-subagents/artifacts/ff61099b_researcher_0_output.md` with reviewer guidance.

It does **not** cover the other fog slice (concrete interaction design for cashier, entrance, exit, inventory, kiosk, owner workflows) — that remains a separate future workstream. No issue/ticket files are created yet; this note is the working material from which sharp tickets will be cut and wired.

Architecture preserved: one Windows host, one embedded server, host-owned SQLite/business logic, local-network clients, normal operation without Internet.

## Key Decisions

Split between **evidence-backed constraints** (imposed by platform documentation) and **proposed v1 product choices** (venue may still revise).

### Evidence-backed constraints

1. **Camera capture requires a secure context and user permission.** `getUserMedia()` is unavailable to an insecure HTTP page; HTTPS (or localhost) is required, and browsers may reject for permission, policy, missing camera, or OS/hardware errors. The LAN origin must therefore be HTTPS, and manual ticket/code entry stays a first-class fallback. [MDN `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
2. **`BarcodeDetector` is not a compatibility gate.** The Barcode Detection API is not Baseline/experimental and uneven. Ship a maintained bundled decoder; use `BarcodeDetector` only as optional acceleration. [MDN Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
3. **A Windows print job needs a Windows printer queue/driver.** The Print Spooler locates/loads the driver and schedules the job; a phone browser must not be expected to print directly to a USB thermal printer. [Microsoft Print Spooler](https://learn.microsoft.com/en-us/windows/win32/printdocs/print-spooler)
4. **Tauri sidecars are packaged executables, not a runtime dependency.** `externalBin` bundles target-triple-named binaries; a self-contained Node sidecar means a clean host needs no Node installed. [Tauri sidecars](https://v2.tauri.app/develop/sidecar/), [Tauri Node sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)
5. **Offline install requires the offline WebView2 payload.** Tauri's `downloadBootstrapper` needs Internet; `offlineInstaller` embeds the runtime and works without Internet at a substantially larger installer size. [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)
6. **mDNS/DNS-SD is local-link discovery, not a guarantee.** VLAN isolation, Wi-Fi client isolation, and firewall policy can still make discovery fail. [RFC 6762](https://datatracker.ietf.org/doc/html/rfc6762), [RFC 6763](https://datatracker.ietf.org/doc/html/rfc6763)
7. **Windows Firewall is profile- and rule-scoped.** Domain/Private/Public profiles; inbound rules can be scoped by application, port, address, and profile. The installer must not silently expose the host on Public networks. [Microsoft Firewall overview](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/), [Firewall rules](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/rules)
8. **Tauri provides the needed lifecycle primitives.** Single-instance plugin closes a second launch and focuses the existing window; close requests can be intercepted, while `destroy` is the force-close path. [Tauri single instance](https://v2.tauri.app/plugin/single-instance/), [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)

### Proposed v1 product choices (venue may later revise)

1. **One certified host target:** Windows 10/11 x64, MSVC target, Tauri v2 installer. No 32-bit, ARM, Windows 7, macOS, or Linux acceptance in v1.
2. **Installer:** prefer NSIS per-user install for the pilot with the WebView2 **offline installer** mode; install under the user's local application area; never put SQLite beside the executable. Keep MSI as a later enterprise option. Per-machine install, code-signing, and update channel remain venue choices.
3. **Sidecar:** bundle one self-contained Node/Hono executable as a Tauri external binary; Rust/Tauri owns its lifecycle; the sidecar never owns a second database or browser UI. Pass explicit `--port`, `--data-dir`, and config; never depend on machine `PATH` or a separately installed Node.
4. **Port:** fixed documented high port (proposed default `43117`) for the HTTPS/API/WebSocket origin. If occupied, fail with an actionable diagnostic rather than silently switching to a port that invalidates QR/certificate onboarding. Port selection and certificate SAN strategy are tested together.
5. **Close behavior:** main-window close hides/minimizes to tray and leaves the server available to LAN clients. A distinct tray **Quit** stops accepting new work, drains/marks print jobs, gracefully stops the sidecar, then exits. Windows shutdown/logoff follows the same bounded shutdown path.
6. **App data:** resolve OS paths through Tauri app-local-data/path APIs: `%LOCALAPPDATA%/<vendor>/<bundle-id>/data` for SQLite and attachments, `.../backups` for verified backups, `.../logs` for redacted diagnostics, `.../run` for ephemeral lock/readiness material. Never write mutable state under the install directory or a network share. [Tauri path API](https://v2.tauri.app/reference/javascript/api/namespacepath/)
7. **Single instance:** enable Tauri's Single Instance plugin; a second launch focuses the running window and does not start a second sidecar/database.
8. **Readiness contract:** Tauri starts one sidecar and consumes bounded stdout/stderr. The sidecar emits one machine-readable `READY {version,port,origin,instanceId}` line only after (a) data directory exists, (b) migrations/integrity preflight pass, (c) HTTPS listener bound, (d) HTTP health endpoint responds, (e) WebSocket endpoint accepting, (f) printer subsystem probe completes. Tauri additionally polls `/healthz`; only then does the desktop show the LAN QR and mark the host ready. [Tauri sidecar execution](https://v2.tauri.app/develop/sidecar/), [Node child processes](https://nodejs.org/api/child_process.html)
9. **Crash-loop policy:** restart unexpected sidecar exits with bounded exponential backoff (proposed 1 s, 2 s, 5 s), at most three attempts in 60 seconds, then stop and show a maintainer diagnostic. Do not blindly restart known database/schema/integrity failures; preserve logs and require explicit retry after recovery/backup guidance. Normal Quit is never counted as a crash.
10. **Firewall:** installer requests/creates one inbound allow rule for the signed host executable and `43117`, Private (and Domain where applicable) profiles only; no Public profile rule. If policy/elevation prevents automatic setup, the app shows the exact port/profile and a manual remediation path; it never asks staff to disable Firewall.
11. **Discovery:** when ready, advertise a stable service type such as `_kiddy-playground._tcp` on `.local` with a venue/device-specific instance and HTTPS port. mDNS is convenience only: the onboarding QR always contains the canonical trusted HTTPS URL (`https://<canonical-hostname>.local`) and a one-time enrollment token. Numeric-IP URLs are a host-desktop recovery diagnostic only and are never presented as a trusted phone-camera path; if mDNS is blocked, phone camera scanning is disabled and recovery goes to the trusted Windows host desktop.
12. **QR/IP and TLS:** QR encodes HTTPS, the canonical hostname, port, and a short-lived pairing token — not credentials or a permanent secret. The certificate must cover the canonical hostname only; IP URLs are never presented as "trusted" (numeric-IP access is a host-desktop recovery diagnostic). Trust comes from the per-venue local CA provisioned by the installer to prepared devices; an untrusted self-signed certificate is not an acceptable secure origin. Unmanaged phones are not a camera-scan target in v1; manual entry remains available for them.

## Confirmed TLS and Scanner Decisions

Confirmed with the venue; these replace the earlier proposed/unresolved wording for mobile TLS trust, CA ownership, stable hostname, and owner re-pairing. They are v1 decisions, still subject to lab/venue acceptance evidence for exact devices.

- **Camera scanning is guaranteed only on venue-owned, prepared Android scanner devices.** Unmanaged personal phones and iOS/other browsers are manual-entry/future-certification paths, not launch-gated camera support.
- **Android acceptance class:** Android 10+, current or previous-major Chrome, rear camera, full-day battery/storage, venue-owned and installer-pre-provisioned. The exact SKU is still later venue procurement/acceptance; this class does not claim any device has been lab-tested.
- **Trust provisioning is installer/maintainer work, not owner work.** The installer/maintainer pre-provisions certificate trust on scanner devices; the owner only pairs devices by QR and performs no certificate setup.
- **One per-venue local CA is generated at install.** The private key stays host-only; only the trust certificate is provisioned to prepared devices. Pairing QRs carry a short-lived enrollment token, never CA secrets.
- **The host auto-renews its leaf certificate under the same CA.** Paired devices need no re-enrollment unless CA rotation is required.
- **Stable human-readable canonical hostname** (e.g. `kiddy-playground.local`) is the trusted origin and stays unchanged across restarts.
- **mDNS/hostname is the canonical trusted origin.** If mDNS fails, the app does not allow certificate-warning bypass and does not promise trusted phone IP camera scanning; recovery goes to the trusted Windows host desktop, where staff can scan/type the ticket.
- **Manual ticket-code entry is allowed on the trusted Android scanner** when the camera is unavailable or permission is denied; server validation and device-mode authorization remain mandatory (no business-rule bypass).
- **Owner may revoke an old device and pair a fresh pre-provisioned replacement by one-time QR.** An unprepared device must go through maintainer provisioning first.

Normal flow: installer provisions trust → owner pairs device by QR → camera scan works on the trusted hostname.

Fallback flows: camera failure on a trusted scanner → manual code entry on that device (server still validates). mDNS failure → trusted Windows host desktop recovery (numeric-IP manual entry; camera scanning disabled). Unmanaged phone → manual entry; not launch-gated.

## Confirmed Print Decisions

- **V1 is artifact-first with PDF canonical.** The server creates immutable ticket and receipt PDFs; HTML/preview may use the same data contract. Windows/browser print UI sends them to any already-installed printer.
- **No printer driver is a daily-operation dependency.** The app may enumerate installed Windows printer queues/capabilities and show readiness or setup guidance, but it must not auto-download or install drivers during operation. Driver setup is installer/maintainer work with explicit user/admin consent.
- **Native printing is deferred.** If venue testing later proves the print dialog too slow or awkward, certify one exact printer, interface, driver/SDK, firmware, and media tuple. Do not mix native and artifact paths without one print-attempt/audit model.
- **Ticket QR is operational.** Each child ticket carries an opaque QR identity for entrance/exit validation; the server remains authoritative and a human-readable code remains the fallback. Reprints preserve the same ticket identity.
- **Receipts have no QR by default.** A receipt QR requires a later defined lookup, digital-copy, or verification workflow.
- Printing happens after Sale/Ticket commit. Cancelled, failed, or unknown print outcomes never create, void, or duplicate business records; explicit reprints are marked and audited.

Artifact flow: committed Sale/Ticket → versioned canonical PDF → visible Windows print flow → audited print attempt.

### Confirmed media profiles

- **Child ticket:** A4 landscape, four flat paper strips per sheet, with fixed trim marks and a no-content safety margin. Staff folds the strip and attaches it with clear tape; no staples. QR target is **25 mm**, with the QR and human-readable code on the outer face, away from folds, tape, and seams. No child name is printed. Physical scanning still decides whether the target passes.
- **Receipt:** one compact logical **80 mm** PDF profile per completed sale, with no QR. It is not tied to a printer SKU; a physical roll printer or another printer/media setup may render it, subject to acceptance testing.
- **Print settings and UX:** use 100%/actual size, intended orientation and margins, and disabled browser headers/footers. After commit, show separate `Print tickets` and `Print receipt` actions. `Print tickets` creates one combined batch PDF; reprint history can target one ticket or receipt individually.

## Browser/Device Matrix

"Supported" means camera permission, HTTPS trust, decoder operation, authenticated API calls, and a scan acceptance test pass on the venue network. Browser support alone does not prove camera hardware, certificate trust, or local-network policy. These rows are a **proposed certification boundary**, not a claim that any version has already been lab-tested.

| Client/device | v1 status | Minimum proposed certification | Camera/scan rule |
|---|---|---|---|
| Windows host desktop Tauri WebView2, Windows 10/11 x64 | **Desktop host UI (separate from mobile scanner path)** | Installed WebView2 meeting the app's declared minimum; camera permission granted to the desktop origin | The host desktop is the trusted recovery surface for entry/exit and manual code entry; it is not the guaranteed mobile scanner path |
| Android phone/tablet (venue-owned, prepared), Chrome current or previous major | **Supported/certify — launch-gated camera row** | Android 10+ with rear camera, full-day battery/storage, installer-pre-provisioned trust, trusted `kiddy-playground.local` HTTPS URL | Prefer rear camera; handle permission denial and `NotReadableError`; bundled decoder required; `BarcodeDetector` optional acceleration only |
| Unmanaged personal phone, iOS Safari, other browsers | Manual entry / future certification | None | Open the trusted HTTPS URL for API/manual ticket lookup; camera scanning is not launch-gated |
| Firefox desktop/Android | Manual entry / future certification | None | `getUserMedia` is broadly available, but no v1 camera guarantee until a venue lab passes camera, decoder, TLS, and local-network tests |
| Embedded/third-party in-app browsers, old Android WebView, UC/mini browsers | Not supported | None | Offer manual code entry; instruct user to open the canonical URL in a certified browser |
| HTTP origin, untrusted certificate, public/isolated Wi-Fi, no camera, or mDNS failure | Degraded/manual only | None | API/manual ticket lookup may work if reachable; camera scanning is not accepted (recovery via trusted Windows host desktop) |

Evidence: `getUserMedia()` is broadly available but secure-context and permission constrained. [MDN `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) Secure contexts require HTTPS for ordinary LAN resources; localhost is a special case and does not solve phone-to-host access. [MDN Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) `BarcodeDetector` is not Baseline, so the application decoder is required. [MDN Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)

**Acceptance test per certified row:** the launch-gated row is the venue-owned Android Chrome scanner. Join the venue SSID, open the trusted `kiddy-playground.local` QR URL, grant camera permission, scan at least the venue's chosen QR format in bright/dim conditions, deny/re-enable permission, stop/restart camera, switch front/rear where available, lose/rejoin Wi-Fi, and verify manual code entry. Record browser/OS/device versions. This class is a proposed boundary; no Android device has been lab-tested yet.

## Printer Acceptance Class

### Acceptance class (not a SKU)

A printer is v1-compatible when all are true:

- It is visible to Windows as a named print queue on the host (USB or local-network attachment).
- The installed driver accepts the application's selected paper size/orientation and prints text, IDR values, ticket/session data, and a sufficiently large QR/barcode that the certified camera matrix can decode.
- Three consecutive receipts and three tickets print without clipping, unexpected scaling, or encoding corruption after a clean spooler restart.
- Printer disconnect/reconnect, queue pause, out-of-paper condition (where status is exposed), and print-service restart produce visible job status — not silent data loss.
- The venue records model, driver name/version, queue name, paper width, and Windows build in its acceptance evidence. The model is selected later; this note intentionally does not invent one.

Baseline uses the Windows print path rather than direct ESC/POS access; the spooler is the authority for queueing/scheduling and driver loading. [Microsoft Print Spooler](https://learn.microsoft.com/en-us/windows/win32/printdocs/print-spooler) Microsoft's inbox-class-driver/Print Support Apps direction does not prove every receipt printer supports it; do not infer a SKU from it. [Microsoft Printer Driver Design Guide](https://learn.microsoft.com/en-us/windows-hardware/drivers/print/)

### Failure and idempotency rules

- Ticket/sale commit and print dispatch are separate, auditable steps. A print failure never silently cancels a committed sale or ticket.
- Every server print request carries an idempotency key tied to the immutable source document and render version. Outcomes: `queued`, `printing`, `succeeded`, `failed`, `unknown`.
- Same document + same idempotency key: return the existing job; never create a second job after `succeeded`.
- Timeout after dispatch: mark `unknown`, never auto-retry (paper may have printed); require operator confirmation before a new print.
- Definite pre-dispatch/queue rejection: mark `failed`; retry with the same key only if the service proves no dispatch occurred, otherwise require explicit **Reprint**.
- Explicit **Reprint** gets a new attempt ID linked to the original and warns "may duplicate".
- UI surfaces queue name, reason, last state, and retry/reprint action; logs redact child/customer data.
- Browser/PDF print remains a manual fallback for a broken driver; it is not counted as automatic printer success.

## Deployment Contract

### Package and installer

- Build the Node/Hono server into a self-contained Windows `.exe`; place the x64 target-triple-named artifact under Tauri's sidecar binaries and configure `bundle.externalBin`. [Tauri external binaries](https://v2.tauri.app/develop/sidecar/), [Tauri Node sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)
- Ship an offline-capable NSIS installer with the WebView2 offline payload embedded; installation and first run must not reach the Internet. [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)
- Installer performs no automatic printer-driver download and no cloud enrollment; staff pre-installs the venue-selected driver/queue or follows a documented local procedure.
- Sign the installer and sidecar before production distribution. Signing identity/timestamp and SmartScreen handling are unresolved venue choices, not silently assumed solved here.

### Supervision and lifecycle

1. Tauri single-instance guard runs before server startup; existing instance is focused, no duplicate sidecar or SQLite handle.
2. Rust/Tauri starts one sidecar with explicit arguments and hidden console; drains stdout/stderr continuously (Node documents pipe back-pressure if output is not consumed). [Node `child_process`](https://nodejs.org/api/child_process.html)
3. Sidecar validates data path, opens host-only SQLite, runs migrations/integrity preflight, binds HTTPS on `43117`, starts HTTP/WebSocket, probes printer integration, then emits `READY`. Any failure emits a typed fatal diagnostic and exits nonzero.
4. Tauri waits for both `READY` and `/healthz` within a bounded startup deadline (proposed 30 seconds). Desktop shows "starting" and never exposes an onboarding QR before readiness.
5. Sidecar logs structured lifecycle events with timestamps, version, port, and redacted error codes. No auth tokens, QR payloads, or child/customer data in logs.
6. Unexpected exit follows the bounded crash-loop policy above. Database corruption, failed migration, and port/certificate configuration errors stop automatic restart and display recovery guidance.
7. Close-to-tray leaves sidecar and LAN service alive. Tray Quit and OS shutdown: stop accepting new writes, drain bounded in-flight print dispatch, close WebSockets, checkpoint/close SQLite, terminate child. After deadline, Tauri force-terminates and records an incomplete-shutdown diagnostic.

## Network & Security

- SQLite and all mutable data remain host-only; LAN clients call the authenticated one-origin API/WebSocket and never open the database.
- Default port is fixed (`43117`) so QR and firewall setup are deterministic. A conflict is a visible install/startup error, not silent dynamic fallback.
- Advertise `_kiddy-playground._tcp` only after readiness. QR first; the canonical mDNS hostname is the trusted origin and numeric IP is a host-desktop recovery diagnostic only (not a phone-trusted fallback). QR token expires and is single-use/role-scoped.
- Locally trusted HTTPS certificate strategy is confirmed: **one per-venue CA generated at install**, private key host-only, trust certificate provisioned only to prepared venue devices, and a **stable mDNS hostname** (e.g. `kiddy-playground.local`) as the canonical trusted origin with auto-renewed leaf certificates. See Confirmed TLS and Scanner Decisions.
- Add a Private/Domain-only inbound firewall rule for the executable/port; detect Public network profile and show remediation rather than opening it; test setup without admin rights and under enterprise policy.
- **Exact mDNS implementation and real-network behavior** (service name, VLANs, guest Wi-Fi, AP isolation, Windows firewall policy interplay) remain later lab/venue acceptance, not confirmed here.

## Clean-Machine Checklist

A release is not "Windows packaged" until it passes on a reset Windows 10/11 x64 machine with no Node, no project files, no printer driver, no Internet, and a non-admin staff account (plus one elevated install run where required):

1. Offline installer completes, installs/launches WebView2 from the embedded offline payload, and does not wait for a network request.
2. Single-instance second launch focuses the first; no duplicate port, process, database, or QR origin.
3. First run creates only the documented app-local data/log paths; uninstall does not erase separately retained backup data without an explicit policy.
4. Sidecar reaches readiness within the deadline; desktop shows health/version/port and a QR only after readiness.
5. LAN certified devices open the trusted HTTPS origin over the venue SSID; mDNS failure routes recovery to the trusted Windows host desktop (no certificate-warning bypass, no trusted phone IP URL); isolated/public network behavior is explicit.
6. Camera permissions and decoder test pass for every supported matrix row; permission denial, no camera, bad TLS, lost Wi-Fi, and manual entry are understandable.
7. Firewall rule is private/domain scoped and survives restart; no public inbound exposure is introduced.
8. Venue-selected printer queue is installed and all printer acceptance/failure/idempotency scenarios pass. Run once with printer disconnected and once with spooler restarted.
9. Kill sidecar, corrupt/lock a test database copy, occupy the port, and force rapid crashes: diagnostics appear, restart bounds hold, and no crash loop or duplicate print occurs.
10. Close window to tray, use LAN client while the desktop window is hidden, then Quit and verify graceful service shutdown and subsequent clean restart.
11. Remove/rejoin the venue network and change host IP; discovery/QR status and certificate behavior are visible and safe.

## Unresolved Venue Decisions (explicitly not tickets yet)

Real venue decisions that no primary source can settle; each becomes its own sharp ticket later, not resolved here:

- Which exact Android scanner SKU to buy (the acceptance class above is testable; no SKU is invented here).
- Exact browser minimum versions and certified phone models beyond the Android 10+/current-or-previous-major Chrome baseline (the baseline needs a lab run and a maintained support policy).
- Which exact receipt/ticket printer model, paper width, driver version, and QR size to buy (class above is testable; no SKU is invented here).
- Fixed port `43117` versus another reserved high port, and what to do if an existing program occupies it.
- NSIS per-user versus MSI/per-machine deployment, elevation policy, update/rollback behavior, code-signing certificate, and SmartScreen handling.
- Whether the server must continue after user logoff, sleep, or Windows reboot (this note covers close-to-tray, not a Windows service/auto-start product decision).
- Whether printer integration stays Windows queue-based or later adds a narrowly scoped raw ESC/POS driver for a venue-certified device.
- Exact mDNS library/service name and behavior on VLANs, guest Wi-Fi, AP isolation, and Windows firewall policy (the per-venue CA and stable hostname are confirmed; the network/lab behavior is not).
- WebView2 evergreen versus fixed runtime (offline installer solves initial install, not the venue's future security/update process).
- Whether print `unknown` jobs require operator acknowledgement alone or a second-person approval in the audit workflow.

## Sources

Kept from the research draft (primary owners):

- [MDN `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)
- [MDN Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
- [Microsoft Print Spooler](https://learn.microsoft.com/en-us/windows/win32/printdocs/print-spooler)
- [Microsoft Printer Driver Design Guide](https://learn.microsoft.com/en-us/windows-hardware/drivers/print/)
- [Tauri sidecars](https://v2.tauri.app/develop/sidecar/) and [Tauri Node sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)
- [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri Single Instance](https://v2.tauri.app/plugin/single-instance/) and [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- [Tauri path API](https://v2.tauri.app/reference/javascript/api/namespacepath/)
- [Node child process](https://nodejs.org/api/child_process.html)
- [Microsoft Windows Firewall](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/) and [Firewall rules](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/rules)
- [RFC 6762](https://datatracker.ietf.org/doc/html/rfc6762) and [RFC 6763](https://datatracker.ietf.org/doc/html/rfc6763)

Dropped (per research draft): vendor product pages and marketplace listings (cannot choose a printer SKU before venue requirements and driver testing); secondary browser-support tables; prior research-branch artifacts (not treated as current primary evidence).

## Gaps

No source can establish that a particular Android scanner device, flat-paper stock, tape/fold method, compact receipt media, 25 mm QR target, venue Wi-Fi/Windows policy, or real-network mDNS/firewall behavior works without physical acceptance testing. The Android scanner SKU, exact strip dimensions, paper/coating, QR scan reliability, and 80 mm receipt rendering/feeding remain acceptance gaps; native printer integration is a later trigger, not a v1 baseline. The per-venue CA, stable hostname, PDF-canonical artifact path, ticket QR purpose, no-receipt-QR default, logical media profiles, explicit print actions, and combined ticket batch are confirmed, but no Android device or physical printable media has been lab-tested yet. Browser rows are proposed certification boundaries, not completed compatibility evidence. Later work: cut the remaining sharp acceptance/deployment tickets, wire blockers, then work the first frontier ticket.
