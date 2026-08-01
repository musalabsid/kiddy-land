# Kiddy Playground v1 — Product Specification

Status: ready-for-agent
Label: ready-for-agent
Type: spec

## Problem Statement

A single physical playground needs to run a complete operating day from one Windows venue computer and its local network, even when the Internet is unavailable. Today, the required work is fragmented across manual ticketing, payment recording, printed or handwritten admission evidence, playtime tracking, product sales, membership discounts, inventory counts, deposit settlement, device coordination, alerts, reports, and recovery procedures.

The venue needs one authoritative operating system for one-child/one-visit admission, retail sales, memberships, inventory, staff access, local devices, and daily reporting. It must prevent duplicate admission and duplicate charges, preserve an auditable history, keep customer-facing documents usable when a printer is unavailable, and give staff safe recovery paths for lost QR tickets, disconnected devices, late exits, closures, and failed print attempts.

The product is local-first rather than cloud-dependent. The Windows venue computer is the Local Server and source of truth. Local-network clients must remain thin, must not write directly to SQLite, and must never claim a successful mutation while disconnected.

## Solution

Build a single-venue Kiddy Playground v1 platform with:

- one supported Windows 10/11 x64 host;
- a Tauri v2 host application supervising one self-contained Node/Hono Local Server;
- one host-only SQLite database owned by the Local Server;
- a desktop client and local-network PWA clients for paired Device Modes;
- server-owned business rules, authenticated HTTP commands/queries, and authenticated WebSocket events;
- one-child/one-visit Playground Tickets and Play Sessions;
- mixed Sale checkout for Ticket Lines and Product Lines;
- manually confirmed cash, QRIS, and bank-transfer payment methods;
- optional one-child memberships, configurable discounts, and per-ticket deposits;
- POS, Product/SKU, barcode, Stock Intake, Stock Count, refund, and low-stock behavior;
- Owner, Cashier, Staff, and restricted Public Kiosk access;
- local pairing, offline HTTPS, trusted prepared Android scanner devices, and safe reconnect behavior;
- visual and configurable local-sound notifications;
- Operations + Financial reports, CSV/PDF exports, Verified Backup, and Owner-only Staged Restore; and
- PDF-canonical Receipt and Ticket artifacts with visible Windows/WebView/browser printing for v1.

V1 has no Internet dependency for normal operation. The host must be powered and the application must be running for LAN clients to operate. If a printer is absent or a print dialog fails, the committed Sale and Ticket remain valid and the operator can use the PDF or digital QR fallback.

## User Stories

### Venue setup, hosting, and local operation

1. As an Owner, I want to install the venue application on a supported Windows 10/11 x64 computer without Internet access, so that the venue can start operating without a cloud account.
2. As an Owner, I want the installer to include its required WebView2 runtime and a self-contained server executable, so that the host does not depend on a separately installed Node runtime or a live network.
3. As an Owner, I want the host application to create its mutable database, logs, backups, and runtime data under app-local data storage, so that installation files and network shares cannot corrupt the operating data.
4. As an Owner, I want a second application launch to focus the running instance instead of starting a second server, so that two processes cannot compete for the SQLite database or network port.
5. As an Owner, I want the host to show a bounded starting state and a health/readiness result before displaying onboarding information, so that staff never pair with a server that is not ready.
6. As an Owner, I want the application to expose the Local Server's version, health, port, and diagnostic state, so that I can distinguish a normal operating problem from a deployment failure.
7. As an Owner, I want closing the main window to minimize to the tray while leaving the Local Server available, so that LAN clients do not stop merely because the host UI is hidden.
8. As an Owner, I want an explicit Quit/Stop action to warn about connected devices and shut down the Local Server gracefully, so that the venue can stop safely rather than leaving partial writes.
9. As a Maintainer, I want unexpected sidecar exits to use bounded restart attempts and then stop with diagnostics, so that a database or schema failure does not create an uncontrolled crash loop.
10. As an Owner, I want the host to continue its local desktop operation when the venue router or Wi-Fi is unavailable, so that I can use the host while waiting for LAN clients to reconnect.
11. As an Owner, I want the venue timezone and host clock to be explicit, so that Operating Day, ticket validity, overtime, closures, reports, and alerts use the venue's local time.
12. As an Owner, I want a clear private/domain firewall setup path, so that the Local Server is reachable on the venue LAN without exposing it through a Public network profile.
13. As an Owner, I want a stable fixed local HTTPS origin and a visible port conflict error, so that pairing and certificate trust do not silently break after a restart.
14. As an Owner, I want an enrollment QR containing the trusted hostname and a short-lived one-time token, so that a new client can be paired without exposing a permanent credential.
15. As an Owner, I want to revoke a Paired Device immediately, so that a lost or untrusted device can no longer use its old credential or WebSocket connection.
16. As a Staff User, I want a persistent Connection State indicator, so that I know whether the screen is authoritative, disconnected, reconnecting, or safe only for read-only display.
17. As a Staff User, I want disconnected clients to disable mutations and avoid optimistic success messages, so that a lost network cannot create false tickets, payments, admissions, exits, or stock changes.
18. As a Staff User, I want a reconnecting client to refresh authoritative state before enabling writes, so that stale screens cannot overwrite current server state.
19. As a Maintainer, I want the Local Server to remain the only writer to SQLite, so that every client observes the same business rules and database integrity is not dependent on a network filesystem.
20. As an Owner, I want normal operation to require no Internet, cloud service, external identity provider, or payment gateway, so that a venue can continue serving customers during an Internet outage.

### Identity, roles, device modes, and language

21. As an Owner, I want to create and manage Staff Users with Owner, Cashier, or Staff roles, so that actions are attributable and permissions follow separation of duties.
22. As an Owner, I want each Paired Device to have a Device Mode, so that the same local application can provide Cashier, Entrance Scanner, Exit Scanner, Inventory, Owner Dashboard, or Public Kiosk workflows.
23. As a Staff User, I want a private device to require Username and password after enrollment, so that every private action records the person, device, and mode.
24. As an Owner, I want a Public Kiosk to use restricted device credentials without staff credentials, so that a public surface cannot impersonate a staff member.
25. As an Owner, I want effective authorization to be the intersection of the Staff User's Role and the Paired Device's Mode, so that changing a device mode cannot grant privileges the user does not possess.
26. As an Owner, I want every mutation and correction to record Staff User, Paired Device, Device Mode, timestamp, reason where required, and result, so that the audit trail explains who did what.
27. As a Staff User, I want to choose Bahasa Indonesia or English for my session, so that the interface is usable by the staff member operating it.
28. As an Owner, I want Bahasa Indonesia to be the new-installation and venue fallback language, so that a newly configured venue has a predictable default.
29. As an Owner, I want a Paired Device without a user to use its configured language or venue fallback, so that a Public Kiosk remains localized without a staff login.
30. As a Staff User, I want UI labels, alerts, QR Tickets, and Receipts to follow the active user/device fallback language, so that customer-facing output matches the operating context.
31. As a Staff User, I want IDR/Rp formatting to remain fixed while date and number presentation follows the selected language, so that translated display never changes the underlying money value.

### Owner configuration and administration

32. As an Owner, I want to configure one continuous opening/closing interval per venue day, so that admission and Play Session timing follow the actual operating schedule.
33. As an Owner, I want to define closed days and date-specific full-closure, early-closing, exceptional-opening, and pricing overrides, so that holidays and special operating days are explicit.
34. As an Owner, I want a full closure or early closing to block new sales and entries, so that the venue does not admit customers outside its operating window.
35. As an Owner, I want paid Waiting Tickets that cannot be admitted because of a closure to be refunded according to the sale rules, so that customers are not left with unusable tickets.
36. As an Owner, I want to configure weekday/weekend Price Periods and Ticket Packages, so that normal prices can follow the venue calendar.
37. As an Owner, I want a Ticket Package to define included duration, overtime rate, Ticket Deposit, and Deposit Policy, so that the exit calculation is deterministic.
38. As an Owner, I want to configure an Unlimited Package, so that a package can run until exit or effective closing without accruing overtime during opening hours.
39. As an Owner, I want completed Sales to snapshot package price and rules, so that later configuration changes cannot rewrite an existing customer's ticket.
40. As an Owner, I want to configure membership eligibility and discount amounts per Ticket Package and Product, so that benefits are explicit and non-stacking.
41. As an Owner, I want to create, archive, and reactivate Products/SKUs with current prices and Low-Stock Thresholds, so that the POS catalog reflects sellable goods without deleting history.
42. As an Owner, I want to configure notification routes by server event and Device Mode, so that each venue can decide where operational alerts appear.
43. As an Owner, I want to review connected devices, their modes, connection state, and revocation status, so that local operations remain observable.
44. As an Owner, I want to create a daily automatic Verified Backup and use Back up now, so that the venue has a recoverable snapshot without Internet storage.
45. As an Owner, I want to configure a second backup destination or removable drive, so that a copy can be separated from the primary application data area.
46. As an Owner, I want to perform an Owner-only Staged Restore with a safety backup, write blocking, explicit confirmation, and integrity validation, so that recovery cannot silently destroy current data.
47. As an Owner, I want an integrity failure to block writes and guide me toward recovery without silently repairing or restoring the database, so that the failure remains diagnosable.

### Cashier and Counter command center

48. As a Cashier, I want a Counter command center focused on the next checkout action, so that I can serve customers without navigating a broad administration dashboard.
49. As a Cashier, I want to start a Sale containing any combination of independent Ticket Lines and Product Lines, so that admission and retail can be completed in one checkout.
50. As a Cashier, I want every Ticket Line to represent one child and one visit, so that multiple children never become an ambiguous group ticket.
51. As a Cashier, I want to identify the child or member associated with each Ticket Line, so that the ticket and any membership benefit belong to the correct child.
52. As a Cashier, I want to register a Member during checkout or in a separate Membership flow, so that a first visit does not require a separate customer journey.
53. As a Cashier, I want to identify an existing Member by scanning the membership code or using verified name/phone lookup, so that a lost membership card does not destroy history.
54. As a Cashier, I want eligible membership discounts to appear per line without stacking with another discount or Price Override, so that the total is explainable.
55. As a Cashier, I want to add an optional Ticket Deposit per Ticket Line and see its policy, so that the customer understands what may be returned, forfeited, or applied later.
56. As a Cashier, I want to find Products by barcode, SKU, or name, so that products without a barcode remain sellable.
57. As a Cashier, I want normal product sales to be blocked when stock would become negative, so that inventory remains trustworthy.
58. As an Owner, I want to authorize an out-of-stock Product Line with a reason, so that an exceptional sale is possible without hiding the inventory exception.
59. As a Cashier, I want one manually confirmed payment method per Sale—cash, QRIS, or bank transfer—so that the completed Sale has a clear payment record.
60. As a Cashier, I want QRIS and bank-transfer confirmation to be manual and explicit, so that the system never implies external payment-provider verification.
61. As a Cashier, I want a Sale to become final only after full payment confirmation, so that incomplete carts do not issue usable Tickets, reduce stock, or become revenue.
62. As a Cashier, I want ticket creation, deposit credits, inventory reduction, Receipt numbering, and revenue recording to complete atomically, so that a partial failure does not leave inconsistent business records.
63. As a Cashier, I want to see a final itemized Receipt for a completed Sale, so that the customer receives one numbered record for the purchase.
64. As a Cashier, I want each Ticket Line to produce an individual QR Ticket identity, so that each child can enter and exit independently.
65. As a Cashier, I want to print all Tickets through one combined batch PDF with separate ticket strips, so that a mixed or multi-child Sale is efficient without creating a group ticket.
66. As a Cashier, I want separate `Print tickets`, `Print receipt`, `Open/download PDF`, and `Show QR` actions, so that a printer or dialog failure does not block customer service.
67. As a Cashier, I want a print attempt to be recorded separately from Sale completion, so that a cancelled or unknown print result never voids or duplicates the committed Sale.
68. As a Cashier, I want to reprint a Receipt or individual Ticket with an explicit reason and visible reprint marker, so that duplicates are deliberate and auditable.
69. As a Cashier, I want to void an unpaid or not-yet-finalized cart, so that abandoned checkouts do not become revenue.
70. As a Cashier, I want to refund eligible lines from a completed Sale with a reason, so that customer corrections preserve the original activity and show the net result.
71. As a Cashier, I want a pre-entry Ticket refund to invalidate the Waiting Ticket, so that a refunded customer cannot later enter using the same ticket.
72. As a Cashier, I want a Product refund to record return-to-sellable-stock or damaged/consumed outcome, so that stock reflects what actually happened.
73. As a Cashier, I want to see my own current-day sales/payment summary and ticket count, so that I can reconcile my work without viewing restricted business reports.
74. As a Cashier, I want active-play children, operational metrics, and routed alerts visible as secondary context, so that I can remain aware of the venue without losing the checkout task.

### Entrance and ticket recovery

75. As an Entrance Staff User, I want an Entrance Scanner mode that opens ready to scan, so that the next admission action is obvious.
76. As an Entrance Staff User, I want a valid Waiting Ticket scan to start exactly one Play Session, so that entry time—not sale time—starts the timer.
77. As an Entrance Staff User, I want a second scan of an already Active, Completed, Voided, Expired, or admitted Ticket to return its state without mutation, so that duplicate scans do not create a second visit.
78. As an Entrance Staff User, I want an invalid or unknown ticket result to explain the safe next action, so that staff do not guess or create a replacement visit.
79. As an Entrance Staff User, I want to recover a lost QR by verifying the child or Member and locating the existing Ticket, so that the same ticket identity can be reissued without a second visit.
80. As an Entrance Staff User, I want manual ticket-code entry when camera scanning is unavailable, so that a prepared scanner can still operate safely.
81. As a Public Kiosk user, I want to validate a Ticket and see remaining time through a restricted public check, so that the kiosk can answer a basic operational question without exposing private history.

### Exit, overtime, deposit, and closing

82. As an Exit Staff User, I want to scan an Active Ticket and see elapsed time, included time, overtime, deposit, and settlement result, so that exit is explainable.
83. As an Exit Staff User, I want the first valid exit scan to end the Play Session, so that a child has exactly one exit lifecycle.
84. As an Exit Staff User, I want a finite ticket to calculate overtime from the ticket's snapshotted package rules, so that later price changes cannot alter the amount.
85. As an Exit Staff User, I want the five-minute alert to be emitted once when the finite session crosses the warning threshold, so that staff are not repeatedly alerted for the same threshold.
86. As an Exit Staff User, I want the Ticket Deposit to be applied according to the package's Deposit Policy, so that refund remainder, overtime forfeiture, and unlimited-cap behavior are consistent.
87. As an Exit Staff User, I want an Unlimited Package to avoid overtime during opening hours while retaining its exit lifecycle, so that unlimited admission does not become an untracked session.
88. As an Exit Staff User, I want a calculated Outstanding Charge to remain due until collected or explicitly waived, so that incomplete financial settlement is visible.
89. As an authorized Cashier or Owner, I want to handle a non-standard waiver, correction, refund, or Price Override with a reason, so that the Exit Scanner cannot silently alter money.
90. As an Exit Staff User, I want a duplicate exit scan to return the existing exit and settlement state without another charge, so that retrying a scan is safe.
91. As an Exit Staff User, I want an auto-closed session to be visibly marked with the effective closing time and system-generated reason, so that missing exit scans remain auditable.
92. As an Owner, I want unresolved Active Sessions to auto-exit at effective closing with overtime calculated through closing, so that the venue can close without orphaned sessions.
93. As an Owner, I want waiting Tickets to expire at closing and paid Tickets blocked by closure to be handled according to the refund rules, so that ticket validity follows the Operating Day.
94. As an Exit Staff User, I want invalid, missing, auto-closed, and already-settled results to provide recovery guidance instead of another exit action, so that staff do not create duplicate financial activity.

### Inventory and Product operations

95. As an Inventory Staff User, I want to scan or search a Product and see current integer stock and its Low-Stock Threshold, so that physical work starts from authoritative data.
96. As an Inventory Staff User, I want to record an auditable Stock Intake with Product, quantity, date, and optional cost/reference, so that received goods are traceable.
97. As an Inventory Staff User, I want to perform a Stock Count that shows system quantity and physical variance, so that discrepancies are visible before they change stock.
98. As an authorized approver, I want to approve a Stock Count variance with a reason, so that inventory changes are intentional and attributable.
99. As an Owner, I want low-stock alerts when a Product reaches or falls below its threshold, so that I can act without an automatic purchase-order system.
100. As an Owner, I want archived Products removed from normal POS selection but retained in sale and inventory history, so that discontinuation does not erase reporting evidence.
101. As a Cashier, I want a completed Product Line to reduce stock atomically, so that a committed sale and inventory movement cannot diverge.
102. As a Cashier, I want a Product refund to either restore sellable stock or record damaged/consumed disposition, so that the inventory ledger matches the returned item.
103. As a Cashier, I want Product price changes to affect future Sales only, so that historic Receipts preserve the original price, discount, and total snapshot.
104. As a Public Kiosk user, I want to scan a Product and see its public price only, so that price checking does not disclose stock, costs, or private operations.

### Reports, alerts, and recovery evidence

105. As an Owner, I want daily financial reports for sales, Ticket/Product/Overtime revenue, payment methods, Cashiers, refunds, voids, Price Overrides, and deposit cash movements, so that the venue can reconcile business activity.
106. As an Owner, I want reports to separate refundable Ticket Deposits from revenue, so that cash flow is not counted as business revenue twice.
107. As an Owner, I want live Occupancy to be the count of Active Play Sessions, so that the dashboard reflects children currently playing without inventing capacity percentages.
108. As an Owner, I want live entries, exits, auto-closed sessions, overtime, package activity, low stock, and connected-device state, so that operational problems are visible during the day.
109. As an Owner, I want inventory reports for stock, Stock Intake, approved Stock Count variances, Product movements, archived Products, and Low-Stock Threshold alerts, so that retail operations are auditable.
110. As an Owner, I want membership reports for active/deactivated Members, visits, eligible discounts, and membership-linked Ticket history, so that membership benefits can be reviewed.
111. As an Owner, I want to filter reports by date range, Cashier, payment method, package, Product, and Member status, so that a report answers a specific operating question.
112. As an Owner, I want to export a filtered report as CSV or PDF with period and generation time, so that the result can be analyzed or shared.
113. As an Owner, I want every correction to preserve original activity, staff, time, reason, and net result, so that reports remain auditable rather than rewriting history.
114. As an Owner, I want a five-minute alert routed to configured Cashier and scanner modes, so that the venue can warn staff without exposing private details on a Public Kiosk.
115. As an Owner, I want ticket-expired and low-stock notifications routed according to configured Device Modes, so that each alert reaches the operational surface that can act on it.
116. As a Staff User, I want visual alerts that can be acknowledged or dismissed per device, so that an alert does not block the current task or change the underlying event.
117. As a Staff User, I want optional local sound with a device-local mute state, so that sound can fit the venue while visual state remains mandatory.
118. As an Owner, I want no child name or private operational detail sent to a Public Kiosk, so that public surfaces preserve privacy.
119. As a Maintainer, I want a repeatable full-day Maintainer Checklist with setup, steps, expected results, evidence, and PASS/FAIL status, so that acceptance does not depend on an undocumented owner demonstration.
120. As a Maintainer, I want acceptance to include LAN loss, reconnect, duplicate scans, device revocation, backup, restore, bilingual smoke, PDF/print attempts, and physical QR checks, so that the offline operating promise is evidenced rather than assumed.

## Implementation Decisions

### Product and domain model

- The venue is single-site and single-tenant in v1. Multi-branch, cloud coordination, and automatic host failover are not part of the model.
- A Playground Ticket is permission for one Child to make one visit. It has one immutable identity and one entry/exit lifecycle. A second visit requires a new Ticket.
- A Play Session begins at the first valid entrance scan and ends at the first valid exit scan. Waiting Tickets have no started session. Finite sessions can accrue Overtime; Unlimited Packages do not accrue Overtime during opening hours.
- Ticket lifecycle behavior is state-aware and idempotent: Waiting, Active, Overtime behavior, settled Completed, Auto-closed, and Voided outcomes are returned rather than duplicated when a scan or submit is repeated.
- A Sale can contain any combination of Ticket Lines and Product Lines and has one manually confirmed Payment Method. Split and partial payments are not supported.
- Sale finalization is atomic across Ticket creation, deposit allocation, Product stock reduction, Receipt numbering, and revenue recording. Printing occurs after commit and cannot determine whether the Sale exists.
- Membership is optional and belongs to one Child. Membership discounts are configured per Package/Product, do not stack, and do not retroactively alter completed Sales.
- Ticket Deposits belong to a Ticket Line and are not reusable Member balances. Deposit Policy is snapshotted with the Package and governs refund remainder, overtime forfeiture, or unlimited-cap behavior.
- Product is an independent integer-stock SKU. Optional barcodes are unique. Price, discount, and total snapshots are preserved on completed Product Lines. Stock Count variances require approval; out-of-stock exceptions require Owner authorization and a reason.
- Operating Day is the venue's local calendar date from midnight through midnight. Calendar overrides, closures, package snapshots, and report filters use the venue timezone.

### Highest testing seam and server ownership

The primary seam is the **Local Server application interface**. It is the highest useful seam because every desktop, PWA, scanner, kiosk, and future client must observe the same business rules. The implementation should expose authenticated commands, queries, and event subscriptions through this interface and keep client components thin.

The interface must cover at least:

- Sale creation, pricing/discount resolution, payment confirmation, finalization, cart void, line refund, Price Override, and reprint attempt;
- Ticket lookup, lost-ticket recovery, entrance admission, exit settlement, overtime, deposit outcome, duplicate-scan response, auto-close, and closure handling;
- Member registration/lookup/deactivation/reactivation and membership discount resolution;
- Product lookup, Stock Intake, Stock Count submission/approval, product refund disposition, low-stock state, and out-of-stock authorization;
- User authentication, role/mode authorization, Device Enrollment, revocation, connection state, and localized capability data;
- calendar, Package, Deposit Policy, Product, membership, notification, and venue configuration;
- report queries, CSV/PDF export requests, Verified Backup, Staged Restore, and diagnostics; and
- authenticated WebSocket event subscriptions for active sessions, entries, exits, alerts, stock changes, device state, and other live metrics.

Tests should cross this interface rather than reaching into React components, SQL statements, or private domain helpers. Persistence, clock, identifier generation, PDF rendering, and local operating-system adapters can remain internal implementation seams behind the Local Server interface; they are not separate client-facing contracts in v1.

### Host packaging and runtime

- The host is a Tauri v2 Windows 10/11 x64 application with one self-contained Node/Hono sidecar. No separately installed Node runtime is assumed.
- The installer must be offline-capable and include its WebView2 payload. The current pilot preference is a per-user NSIS package; exact installer flavor, code signing, update/rollback channel, and enterprise elevation policy remain deployment acceptance or venue-policy decisions.
- SQLite, attachments, redacted logs, Verified Backups, and ephemeral run material live under OS app-local data paths and never on a network share or beside the executable.
- Tauri owns single-instance enforcement, sidecar startup/shutdown, readiness, diagnostics, bounded crash recovery, and close-to-tray behavior. The Local Server emits readiness only after data preflight, migrations/integrity checks, HTTPS, HTTP health, and WebSocket availability succeed. Printer availability does not gate readiness.
- The service uses a stable fixed high HTTPS port, with `43117` as the current proposed default. A conflict is a visible startup error, not a silent dynamic-port fallback.
- The canonical trusted origin is a stable per-venue hostname advertised through mDNS/DNS-SD and covered by a per-venue local CA. The Owner's enrollment QR carries that hostname and a short-lived one-time token. Numeric-IP recovery is a trusted Windows-desktop diagnostic only; clients must not bypass certificate warnings for camera access.
- Only prepared venue-owned Android 10+ devices using current or previous-major Chrome are launch-gated for camera scanning. The maintainer provisions local-CA trust; the Owner only pairs by QR. Unmanaged phones, iOS, and uncertified browsers use manual entry until separately certified.
- Firewall access is scoped to Private/Domain profiles. The installer or setup flow must provide actionable remediation rather than ask staff to disable the firewall.
- LAN clients do not open SQLite. If the LAN is unavailable, host-local operation remains possible while client mutations remain disabled until reconnect and authoritative refresh.

### Artifact, QR, and print contract

- The canonical v1 customer-facing artifacts are immutable, versioned PDFs rendered from committed Receipt/Ticket snapshots. HTML/preview may use the same data contract but is not a second business truth.
- A completed Sale produces one numbered Receipt and one Ticket identity per Ticket Line. `Print tickets` creates a combined batch PDF containing separate child-ticket strips; it never creates a group ticket or group QR. `Print receipt` produces the compact logical 80 mm Receipt PDF.
- Ticket media targets A4 landscape with four flat strips, trim/safety margins, fold/tape guidance, and an outer-face QR target of 25 mm. The Ticket PDF does not print a Child name by default. These physical dimensions, stock, folding, and scan reliability are acceptance targets.
- Ticket QR is operational identity: an opaque non-PII token mapped by the Local Server to the immutable Ticket, plus a human-readable code for manual entry and staff verification. No Child name, phone, membership, Sale amount, or other private data is encoded.
- Receipts have no QR in v1. A Receipt QR requires a later defined lookup, digital-copy, or verification workflow.
- V1 physical printing uses visible Windows/WebView/browser print UI. The app must show separate Print tickets, Print receipt, Open/download PDF, and Show QR actions. Browser callbacks and Windows queue acceptance do not prove that paper emerged.
- Print attempts are separate from Sale/Ticket commits. The interface records source identity, artifact/render version, actor, time, target when known, and an outcome such as requested, cancelled, failed, or unknown. Unknown outcomes never auto-retry; explicit reprint warns of possible duplication and retains the original business identity.
- Native/direct printer integration is deferred. It may be introduced only after venue throughput or ergonomics acceptance proves the visible flow inadequate, and it must consume the same artifact and print-attempt/idempotency model.

### UX and device-mode boundaries

- Every surface shows Connection State, Operating Day context, active user when applicable, Paired Device/Device Mode, and active language.
- Mutation success is shown only after the Local Server responds authoritatively. Duplicate scan/submit states are explicit and non-mutating.
- Every operational mode has ready, scanning/searching, confirmation, success, invalid/expired, duplicate/already-complete, permission, disconnected/reconnecting, and print-failure states where applicable.
- Cashier/Counter is the primary desktop workflow. It supports mixed Sales, Member identification, Package/Product selection, payment confirmation, artifact actions, current-day summary, active-play context, and alerts without becoming the full Owner dashboard.
- Entrance Scanner is scan-first and limited to ticket result, admission, duplicate handling, invalid-state guidance, and lost-ticket recovery.
- Exit Scanner is scan-first and can record only deterministic Package-computed exit settlement. It cannot make a general refund, alter a calculated amount, apply a Price Override, or waive an Outstanding Charge. Exceptions use an authorized Cashier/Owner correction flow.
- Inventory mode supports Product lookup, Stock Intake, Stock Count, variance submission, approval state, and low-stock review. It cannot sell, confirm customer payments, alter prices, or silently change stock.
- Public Kiosk exposes only restricted ticket remaining-time/validation and public Product price checks. It has no staff login, membership lookup, deposit history, private Child information, sales, reports, or operational alerts.
- Owner surfaces handle users/roles, pairing/revocation, calendar/Packages, Products/membership rules, approvals, reports/exports, diagnostics, Verified Backup, and Staged Restore.
- Visual alerts never depend on sound or voice. Local sound is configurable and device-local. Private Child/Member information never routes to a Public Kiosk.

### Reporting, audit, backup, and localization

- Owner reports cover Financial, Playground, Inventory, and Membership views. Revenue includes Ticket prices, Product Lines, and settled Overtime; refundable Ticket Deposits are separate Deposit Cash Flow.
- Live operational metrics use authenticated WebSocket events. Historical reports query authoritative server state and refresh with filters; clients do not poll as a substitute for events.
- Reports preserve original activities and represent refunds, voids, Price Overrides, and other Audited Corrections separately with staff, timestamp, reason, and net result.
- Verified Backup is a consistent SQLite snapshot with integrity check, app/schema version, timestamp, size, verification status, destination health, and retention-safe pruning.
- Staged Restore is Owner-only, creates a safety backup, blocks writes/stops the server, requires confirmation, validates the restored snapshot, and restarts only after validation.
- UI, system alerts, QR Tickets, and Receipts are localized to Bahasa Indonesia or English according to user/device/venue fallback. Stored names, business data, and amounts are not translated; currency remains IDR/Rp.

### Acceptance and release boundary

- Exact Windows host model/OS build, prepared Android SKU/browser, local CA provisioning, router/AP, firewall/mDNS behavior, PDF renderer/browser print behavior, printer/driver/media, optional USB scanner, and local audio device are Maintainer Checklist fixtures.
- Acceptance covers clean-machine offline install, single instance, sidecar readiness/recovery, no Internet, trusted scanner onboarding, camera/manual fallback, LAN loss/reconnect, IP change, mDNS failure recovery, duplicate scans, device revocation, full-day operations, bilingual smoke, PDF pagination/scaling, QR readability after venue media handling, print dialog outcomes, and backup/restore.
- If the venue elects physical printing, the actual printer/driver/paper is tested for clipping, scaling, queue/dialog failure, paper/cutter behavior where applicable, unknown outcomes, explicit reprint, and QR readability. This does not make native/direct printer integration a v1 dependency.
- Acceptance evidence is external behavior and repeatable evidence: state/result, audit record, artifact, screenshot, receipt/PDF, scan result, log, or PASS/FAIL checklist—not an assertion about a particular React component, SQL query, or internal helper.

## Testing Decisions

- Tests must verify observable behavior through the Local Server application interface. They should assert returned state, authoritative mutations, emitted events, artifacts, audit records, permission results, and recovery outcomes rather than implementation details.
- The primary automated seam is the server command/query/event contract backed by a real temporary SQLite database or an equivalent isolated persistence adapter. The highest-value tests exercise full workflows across the seam: Sale finalization, duplicate admission/exit, deposits, refunds, stock movement, role authorization, pairing/revocation, reports, backup/restore, and reconnect gating.
- Lifecycle and pricing tests should be table-driven around Waiting, Active, finite Overtime, Unlimited Package, Completed, Auto-closed, Voided, closure, and duplicate-scan states. They should use controlled venue time and assert exact state transitions and money/deposit results.
- Sale tests should prove atomic success and failure behavior, one Payment Method, mixed Ticket/Product Lines, membership discounts, stock guards, out-of-stock authorization, Receipt/Ticket identity, and Audited Correction behavior.
- Permission tests should run representative commands through each Role/Device Mode combination and prove both allowed operations and denied operations. Public Kiosk tests must assert absence of private data, membership lookup, reports, deposits, and mutations.
- WebSocket tests should verify authenticated delivery of active-session, alert, stock, device, and report-relevant events and safe behavior when a client disconnects or is revoked.
- Artifact tests should assert deterministic Receipt/Ticket content, locale/IDR formatting, separate child-ticket identities, combined batch pagination, no Receipt QR, opaque non-PII QR payload, reprint marking, and print-attempt idempotency. They must not treat a browser callback or queue acceptance as proof of physical paper.
- Browser/device end-to-end tests should exercise Cashier, Entrance Scanner, Exit Scanner, Inventory, Public Kiosk, and Owner flows against the Local Server contract. Camera tests are launch-gated to the prepared Android acceptance row; manual entry is tested for all degraded rows.
- Backup/restore tests should verify Verified Backup integrity metadata, retention safety, Owner-only access, safety backup creation, write blocking, staged validation, and recovery guidance after integrity failure.
- Localization smoke tests should cover login, Cashier, ticket scan, exit settlement, Receipt/Ticket artifacts, alerts, Kiosk, dates, and IDR in both supported languages without duplicating the entire full-day scenario twice.
- Hardware and clean-machine tests are Maintainer Checklist acceptance rather than unit tests. They must record exact fixture versions and physical QR/print evidence, including the venue's selected media handling.
- The current repository is a small TanStack Start/React scaffold with shared shadcn-style UI components and no existing server, persistence, domain, or end-to-end test suite. There is no prior test harness to preserve; the first implementation should establish contract tests at the Local Server seam and a repeatable browser/fixture acceptance harness.

## Out of Scope

- Multi-branch, cloud-coordinated, remote-owner, or automatic host-failover operation.
- Any Internet dependency for normal operation, cloud backup, external identity provider, payment-provider verification, QRIS gateway integration, or bank-transfer verification.
- Client-side transaction queues, later conflict resolution, or offline mutation replay.
- Group, family, reservation, booking, capacity-slot, no-show, or rescheduling concepts.
- Arbitrary data import or portable database migration. Data Export is CSV/PDF analysis/sharing; recovery uses Verified Backup and Staged Restore.
- Voice announcements. V1 uses visual alerts and configurable local sound.
- Native/direct printer dispatch and raw ESC/POS/cash-drawer integration as a v1 dependency. Native printing may be reconsidered only through a venue-triggered acceptance decision using the existing artifact/print-attempt contract.
- A printer driver as a prerequisite for core transaction correctness.
- Guaranteed camera scanning on unmanaged personal phones, iOS, unsupported browsers, untrusted certificates, numeric-IP phone URLs, or isolated/public Wi-Fi.
- USB keyboard-wedge scanners as a required smartphone strategy.
- A Receipt QR without a separately defined receipt lookup, digital-copy, or verification workflow.
- Automatic reorders, purchase orders, supplier management, accounting-suite behavior, taxes/compliance claims not defined by the venue, or reusable Member deposit balances.
- Exact hardware, browser, printer, paper, scanner, router, media, or SKU support claims before Maintainer Checklist evidence passes.

## Further Notes

- This specification synthesizes the resolved Wayfinding issues, the pulled hardware/packaging fog note, the printables/QR research note, the domain glossary, and the current repository scaffold. It is a product and implementation handoff, not application code.
- The primary seam for implementation and testing is the Local Server application interface. Desktop, PWA, scanner, kiosk, and future clients are adapters over that seam.
- The map is ready for `/to-spec` at the product-specification level. Exact device/media/SKU evidence, venue packaging policy, PDF renderer/browser certification, and any later native printer trigger remain explicit acceptance or deployment-policy gates.
- The spec intentionally keeps one-child/one-visit language, Sale versus Ticket terminology, Ticket Deposit versus Member balance, Operating Day, Revenue, Occupancy, Verified Backup, and Staged Restore aligned with the project glossary.
