# Freeze v1 deployment, printing, and workflow boundaries

Status: resolved
Resolved by: main session
Type: grilling
Label: wayfinder:grilling
Blocked by: 10, 11, 13, 14, 15
Map: ../map.md

## Question

How should v1 reconcile artifact/PDF output with native Windows printing, which deployment capabilities are truly required for one offline venue, and which UX boundaries must be fixed before `/to-spec` turns the decisions into screens and implementation slices?

## Answer

### 1. Print decision: PDF-canonical artifact-first

The v1 product contract is **immutable PDF artifacts first, visible Windows/browser printing second**:

- The Local Server commits the Sale/Tickets first, then renders versioned Receipt and Ticket PDFs from the committed immutable snapshots and active language/IDR rules. HTML/preview may use the same data contract, but the PDF is the canonical portable artifact.
- A completed Sale still produces one numbered Receipt and one individual Ticket identity per Ticket Line. `Print tickets` creates one combined batch PDF containing separate child-ticket strips; it does not create a group ticket or group QR. `Print receipt` opens the compact logical 80 mm receipt PDF. `Open/download PDF` and `Show QR` remain available independently.
- V1 physical output uses the visible Windows/WebView/browser print flow. A printer driver, printer queue, or native dispatch service is not a daily-operation dependency. A cancelled dialog, wrong-paper choice, failed print, or unknown physical outcome is recorded as a print attempt and never rolls back the committed Sale or creates another Ticket/Receipt number.
- Reprint uses the original document and Ticket/Receipt identity, is visibly marked, records actor/time/reason, and warns that an unknown or already-dispatched attempt may duplicate paper. Print status must not claim that paper physically succeeded merely because a browser callback or Windows queue accepted a job.
- Native/direct host printer integration is deferred. It becomes a later, venue-triggered adapter only if throughput or staff-ergonomics acceptance proves the visible dialog inadequate. If added, it must consume the same canonical PDF/artifact and use the same audited attempt, idempotency, `unknown`, retry, and explicit-reprint rules; it must not create a second rendering truth.
- Ticket QR is operational identity: an opaque non-PII token plus a human-readable code. The media target is A4 landscape with four separate flat ticket strips, trim/safety margins, fold/tape guidance, an outer-face QR target of 25 mm, and no child name printed; these dimensions and physical handling remain acceptance targets. Receipts carry no QR in v1 unless a later lookup/digital-copy/verification workflow is explicitly defined.

The contradiction is therefore resolved in favor of the pulled research decision: PDF is the canonical v1 artifact and generic browser/WebView printing is the launch path; native printing is a future optimization, not a parallel v1 business path.

### 2. Frozen minimum deployment assumptions

The following are product-level v1 assumptions, not exact hardware claims:

- **One host/runtime:** one supported Windows 10/11 x64 computer runs the Tauri v2 host and one self-contained Bun/Hono sidecar; no separately installed Bun, Node, or Internet is required. The offline-capable installer must carry the WebView2 payload. The current pilot packaging preference is a per-user NSIS install; installer flavor, signing, update, and enterprise elevation policy remain deployment acceptance decisions.
- **Host data and supervision:** SQLite, attachments, redacted logs, run/lock material, and Verified Backups live under the host's app-local data paths, never beside the executable or on a network share. Tauri enforces single instance, bounded readiness, graceful shutdown, and crash-loop limits. Printer availability is a separate diagnostic and must not gate server readiness because printing is not a daily-operation dependency.
- **Host stays available:** closing the main desktop window leaves the Local Server running (the host UI may minimize to the tray). An explicit Quit/Stop action warns about connected devices and stops the server. The host must remain powered and the application must remain running for LAN clients to operate; service-after-logoff, sleep, or reboot is not assumed without acceptance evidence.
- **Private local network:** the host and clients share the venue's private LAN. The Local Server exposes one trusted local HTTPS origin on a stable fixed high port (current proposed default `43117`); a conflict fails startup with an actionable diagnostic rather than silently changing the endpoint. The canonical origin is a stable mDNS/hostname covered by the per-venue local CA. The Owner-displayed enrollment QR contains that HTTPS URL and a short-lived token. Numeric-IP recovery is for the trusted Windows host desktop only; it is not a trusted phone-camera path and never permits certificate-warning bypass. Windows firewall access is Private/Domain only. No Internet, cloud account, WAN, captive portal, or venue hotspot is required for normal operation.
- **Prepared scanner devices:** camera scanning is guaranteed only on venue-owned, maintainer-prepared Android 10+ devices using current or previous-major Chrome and the trusted local CA. Unmanaged personal phones, iOS, and other browsers remain manual-entry/future-certification paths. Manual ticket/code entry is mandatory whenever camera permission, camera hardware, decoder, or trust is unavailable. USB keyboard-wedge scanners are optional acceptance fixtures, not a product dependency.
- **Authoritative writes:** a client must have a live Local Server connection to sell, confirm payment, scan/admit/exit, settle, change stock, or perform any other mutation. Disconnected clients may show a shell or last safe view, but cannot claim success and do not queue transactions; reconnect refreshes authoritative state before writes return.
- **Output capability:** immutable PDF artifacts, visible Windows/browser print flow, and digital QR presentation are always required. A printer driver, queue, or native host printer service is not required for core daily operation. If the venue elects to provide physical output, its exact printer, driver, paper, QR readability, and failure behavior are acceptance fixtures; native/direct printing is a later trigger, not a v1 dependency.
- **Alerts and recovery:** visual alerts are required; local audio is optional and muteable. A writable application-data backup destination is required for Verified Backups; an Owner-configured second path or removable drive is recommended but not required for basic operation. There is no redundant host, automatic failover, or client hotspot requirement.
- **Identity and language:** local Username/password authentication, the already-defined Owner/Cashier/Staff roles, paired device modes, Bahasa Indonesia/English, and fixed IDR are the only v1 identity/localization assumptions. No external identity or payment-provider verification is required.

Exact host model, Android SKU, browser build, network equipment, printer/scanner model, driver, paper stock, QR dimensions, CA provisioning evidence, and physical scan/print results are deliberately acceptance fixtures rather than unresolved business behavior.

### 3. Minimum workflow UX boundaries

The `/to-spec` work may choose layout, visual hierarchy, copy, responsive composition, and shadcn component composition, but it must preserve these boundaries.

#### Shared operating contract

- Every operational surface always shows its connection state, venue/Operating Day context, active user (when applicable), paired Device Mode, and active language.
- The only success state for a mutation is the authoritative server response. Repeated scans or a repeated submit are state-aware/idempotent; they do not create a second Ticket, Sale, session, stock movement, or charge.
- Each mode has explicit ready, scanning/searching, confirmation, success, invalid/expired, duplicate/already-complete, permission, disconnected/reconnecting, and (where relevant) printer-failed states. Errors explain the next safe action rather than exposing raw implementation details.
- Scanning is scan-first on a prepared venue Android device with a large camera target and manual entry fallback. An unprepared/untrusted device must clearly offer manual entry rather than implying camera support. A normal scan resolves one relevant ticket, membership, or product at a time; broad search and recovery lookup are separate intentional actions.
- Alerts can surface without taking over the current task. Private child/member information never appears on Public Kiosk, and local sound never substitutes for a visible state.

#### Cashier / Counter command center

- The primary task is a mixed Sale: choose independent child Ticket Lines and/or Product Lines, identify a member when applicable, show package/price/discount/deposit details, confirm one payment method, and complete the Sale.
- Completion presents the Receipt, each individual Ticket identity, separate `Print tickets` and `Print receipt` actions, `Open/download PDF`, and `Show QR`. `Print tickets` uses one combined batch PDF with separate child-ticket strips; it never creates a group ticket. The cart can be voided before completion; completed corrections use the existing audited refund/reprint rules.
- The workspace may keep active-play children, current-day cashier totals, and routed alerts visible as secondary context, following Variant A. Alerts must not displace the checkout or make the cashier navigate to a dashboard to finish it.
- Cashier mode does not expose full historical reports, pairing, backup/restore, pricing administration, or unrestricted device administration.

#### Entrance Scanner

- The flow is `ready to scan -> ticket result -> Admit/Explain`. A valid Waiting Ticket is admitted once; Active, Completed, Voided, Expired, or already-admitted tickets show their state without mutation.
- The screen exposes only the child/ticket information needed to make the admission decision. It is not a POS, membership editor, refund screen, or reporting dashboard.

#### Exit Scanner

- The flow is `ready to scan -> active-session result -> elapsed/overtime/deposit summary -> standard exit settlement`. The first valid exit ends the session; duplicate exits return the existing result.
- The Exit Scanner may record only the package-computed standard outcome, including the defined deposit application/refund and calculated overtime collection. It is a narrowly scoped playtime settlement, not a new Sale and not a general payment screen.
- It cannot alter the calculated amount, perform a general ticket/product refund, apply a price override, or waive an Outstanding Charge. Exceptions hand off to an authorized Cashier/Owner correction flow with an audit reason.
- Auto-closed, missing, invalid, and already-settled tickets have explicit recovery guidance rather than a second exit action.

#### Inventory

- Inventory mode is task-first: scan/search a Product, view current stock and threshold, record Stock Intake, perform/submit a Stock Count, or review a low-stock/variance result.
- It does not sell products, confirm customer payments, alter prices, or silently apply an unapproved variance. Approval and audit states are visible.

#### Public Kiosk

- The kiosk offers only the restricted public checks already decided: validate a ticket/show remaining time, or scan a product/show its public price.
- It has no staff login, membership lookup, deposit history, sale/payment/refund action, private child name/history, reports, or operational alerts. It can be paired, revoked, and returned to a safe idle state by the Owner workflow.

#### Owner / administration

- Owner surfaces group configuration and exceptional actions: users/roles, device enrollment/revocation, calendar and packages, products and membership rules, approvals, reports/exports, diagnostics, Verified Backup, and Staged Restore.
- Destructive or money-affecting exceptions require an explicit confirmation and reason. Live operating metrics remain readable without turning every operational screen into an administration dashboard.

### 4. Exact hardware/SKU and physical-output details remain acceptance work

The product decision is capability-based. The acceptance manifest must later name the fixtures and evidence for:

- the clean-machine Windows 10/11 x64 install, offline WebView2 payload, host model/OS build, permissions, app-local paths, firewall profile, close-to-tray/quit, restart, and sidecar recovery;
- the venue-owned prepared Android scanner SKU, Android/Chrome versions, local-CA provisioning, trusted hostname, camera permission/decoder behavior, dim/bright QR scans, reconnect, and manual entry; unmanaged phones/iOS remain manual-entry rows rather than launch-gated camera claims;
- the venue network/router/AP, private/domain firewall rule, stable hostname/mDNS, IP-change behavior, mDNS failure recovery to the trusted Windows desktop, and no-Internet operation;
- the exact PDF renderer/browser/WebView print flow, A4 landscape four-strip ticket pagination, trim/safety margins, fold/tape placement, target 25 mm QR readability, compact logical 80 mm receipt output, 100%/actual-size guidance, browser headers/footers, and no-receipt-QR behavior;
- if physical output is part of the venue deployment, the selected printer model/SKU, Windows driver, paper/media, queue behavior, clipping/scaling, QR readability, paper/cutter failure, cancelled/unknown print attempts, explicit reprint marking, and PDF fallback; this does not make native direct integration a v1 dependency;
- any optional USB keyboard-wedge scanner's model, keyboard layout, focus/suffix, scan timeout, and accidental-keystroke behavior; and
- an optional local audio device plus the visual-alert/mute behavior.

A fixture is not a supported v1 deployment until the relevant Maintainer Checklist evidence passes. Choosing or replacing a SKU is an acceptance/release decision and must not reopen ticket, sale, permission, artifact, or offline-state rules. Native/direct printer integration is a separate future trigger if the visible browser/WebView flow fails venue throughput or ergonomics acceptance.

## Map verdict

The map is clear enough for `/to-spec` at the product-specification level, with explicit acceptance gates.

`/to-spec` may turn these decisions into screen/state specifications, localized copy, server contracts, PDF/artifact contracts, visible print-attempt states, and phased implementation slices. It must preserve the PDF-canonical/browser-print baseline and carry the exact device/media/physical acceptance manifest as a release gate. It does not need to wait for exact SKUs to specify product behavior; the remaining uncertainty is fixture evidence and venue deployment policy, not the ticket, sale, QR, offline, or workflow model.
