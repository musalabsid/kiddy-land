# Research: Kiddy Playground v1 printables and ticket QR

Status: research note (NOT a resolved ticket)
Type: research
Label: wayfinder:research
Map: ../map.md

## Summary

**Yes — server-rendered printable HTML/PDF plus the Windows/browser print flow is a sound v1 baseline**, if the product explicitly accepts a user-controlled print dialog and treats the result as a print *attempt*, not proof that paper came out. It avoids printer-SKU and raw ESC/POS coupling, works with ordinary Windows printer queues and paper, and keeps the server as the source of truth. Use a fixed-layout PDF where pagination must be deterministic, with HTML/CSS print as the accessible preview/fallback.

Defer direct printer integration (silent/native queue dispatch) unless the venue requires one-click thermal throughput at launch. The existing hardware research instead recommends host-native queue printing for controlled printer integration and browser/PDF as fallback; this brief records a new v1 recommendation to make generic artifacts the launch path, subject to physical venue acceptance. Either way, a phone/PWA must not be expected to silently reach a USB/thermal printer.

The ticket QR is **operational identity**: entrance and exit scanners use it to find and validate one child's one-visit ticket. A receipt QR is **not needed** for entry/exit or ordinary accounting; add one only if a later product decision needs receipt lookup, reprint, digital-copy, or customer verification.

## Findings

### 1. Existing repository decisions (evidence, not new recommendations)

1. `specs/spec.md` describes a local-first Windows host, PWA clients, QR ticket scanning, and an existing desktop responsibility for receipt-printer configuration. It also says USB scanners are optional and not implemented in v1. This establishes the host/client architecture, but it does **not** settle whether generic browser print or native printer dispatch is the launch print path.
2. `CONTEXT.md` defines a Playground Ticket as permission for **one child and one visit**, and a Receipt as the numbered customer-facing record of a completed Sale. A mixed Sale has one receipt, while each Ticket Line produces an individual QR ticket. Localized output applies to QR tickets and receipts.
3. Resolved issue `01-ticket-and-session-lifecycle.md` says lost QR recovery reissues the **same ticket identity**, never a second visit; duplicate entry/exit scans are state-aware and do not mutate state.
4. Resolved issue `02-sale-payment-and-receipt-rules.md` says a final Sale atomically creates usable tickets and one numbered itemized receipt; every Ticket Line gets an individual QR ticket. Reprints preserve the original identities, are visibly marked as reprints, and record staff, time, and reason.
5. Resolved issue `10-research-hardware-integration.md` recommends PWA camera scanning with a decoder fallback and says network-client print requests should route to a Windows host/native printer service; browser/PDF may be a fallback. The working note `.scratch/kiddy-playground-v1/fog-hardware-packaging.md` similarly defines a Windows print-queue acceptance class and browser/PDF fallback. Those are **existing product/research decisions**. The generic-artifact-first recommendation below is intentionally narrower and must not silently erase those decisions.

### 2. Browser print is a viable generic artifact boundary, but not an acknowledgement of physical output

1. `window.print()` prompts the user to print the current document. The WHATWG printing algorithm explicitly allows a user agent to offer a physical form **or a PDF representation**, and may wait for the user to accept or decline. [WHATWG HTML — Printing](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#printing)
2. CSS provides the right primitives for a printable artifact: `@media print` changes print-only presentation, and `@page` controls intended page dimensions, orientation, and margins. [MDN — Printing CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing), [MDN — `@page` size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page/size)
3. The W3C paged-media model warns that the physical printer's non-printable area is device-dependent and a user agent may not know it. Therefore CSS cannot guarantee that every printer will honor a custom bracelet/page box without clipping or scaling. [W3C — CSS Paged Media Level 3](https://www.w3.org/TR/css-page/)
4. `afterprint` is useful for updating UI after the print process/preview closes, but it is not a hardware confirmation. The browser specification only says the user agent fires the event after offering the alternate form; it does not certify paper, ink, cutter, feed, or QR readability. [MDN — `afterprint`](https://developer.mozilla.org/en-US/docs/Web/API/Window/afterprint_event), [WHATWG HTML — Printing](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#printing)
5. A PDF can preserve pagination and dimensions better than a live HTML page, but browser/PDF print settings still permit user scaling, paper mismatch, margins, and cropping. Treat PDF as a deterministic artifact, not a guarantee of physical output.

**Product consequence:** server-render immutable print data from the committed Sale/Ticket; expose an HTML print view and, where available, a server-generated PDF using the same contract. Do not commit business state only after a browser print callback. Commit the Sale/Tickets first, then record an explicit print attempt. A cancelled dialog, failed print, lost paper, or duplicate print must never create or remove a ticket.

### 3. Windows comparison: generic artifact versus host-native direct printing

| Path | v1 benefit | Residual cost/risk |
|---|---|---|
| Server HTML/PDF → browser/WebView print UI | Works with ordinary Windows queues, drivers, office printers, and user-selected paper; minimal printer-specific code; PWA and desktop can use the same artifact | User interaction; user can choose wrong printer/paper/scale; browser layout differences; app cannot confirm physical success; slower for high-volume thermal operation |
| Host-native/WebView2 queue printing | Can select a queue, specify settings, print without a dialog, and report API-level statuses; better fit for a certified thermal workflow | Requires Windows/WebView2/native service, queue/driver behavior, printer acceptance and support policy; still cannot prove paper actually emerged |

Microsoft documents the Windows Print Spooler as the component that locates/loads drivers, spools jobs, and schedules them. This supports a generic Windows-queue boundary, not raw direct access from a phone. [Microsoft — Print Spooler](https://learn.microsoft.com/en-us/windows/win32/printdocs/print-spooler)

WebView2 exposes both `ShowPrintUI`, `Print`, and `PrintToPdf`; its `Print` method can report statuses such as `Succeeded` and `PrinterUnavailable`. That makes native host printing possible later, but does not make it required for the artifact-first v1. [Microsoft — Printing from WebView2 apps](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/print)

Even native queue status is bounded. Microsoft's `JOB_INFO_1` says `JOB_STATUS_COMPLETE` means the job was sent to the printer but **may not be printed yet**; port monitors without TrueEndOfJob may mark a job printed immediately after submission. [Microsoft — `JOB_INFO_1`](https://learn.microsoft.com/en-us/windows/win32/printdocs/job-info-1)

**Recommendation:** launch with generic artifacts and a visible browser/WebView print flow when the venue accepts manual selection. Defer direct/native integration until a venue proves the need for silent thermal throughput and supplies a printer/driver acceptance class. If native printing is retained as a launch requirement from issue 10, keep HTML/PDF as the auditable manual fallback and apply the same duplicate/unknown rules.

### 4. Ticket QR purpose: operational identity, not customer data

The QR is the machine-readable handle for the ticket lifecycle:

- Entrance scanner decodes it, asks the local server to validate the ticket in the current device mode, and starts the one allowed Play Session.
- Exit scanner decodes the same identity, ends the session, calculates overtime/deposit settlement, and returns existing state on a duplicate exit scan.
- Server state—not the QR itself—decides waiting, active, completed, voided, expired, or auto-closed status. The QR is not authorization by itself.
- Lost-ticket recovery can find and reissue the same ticket identity, matching the repository decision; a reprint must not create a new child visit.

ISO/IEC 18004 defines QR symbology characteristics, data encoding, dimensions, error correction, decoding, production quality, and application parameters. It does **not** define Kiddy Playground's ticket semantics, receipt requirements, or a required payload format. [ISO — ISO/IEC 18004:2024](https://www.iso.org/cms/%20render/live/en/sites/isoorg/contents/data/standard/08/33/83389.html)

**Recommended payload contract (product choice):**

```text
kp1.<opaque-random-ticket-token>
```

Use a cryptographically random, non-sequential token; map it server-side to the immutable ticket identity. Prefer a stable opaque token for the ticket's valid lifecycle so ordinary reprints and lost-ticket reissue preserve identity. The server can expire/revoke it when the ticket is voided, completed/retained beyond policy, or otherwise invalid. A short-lived token is also possible, but then reprint/recovery must deliberately preserve or re-bind the ticket identity. Never put child name, phone, membership details, sale amount, or other child/customer PII in the QR. A short human-readable ticket code should appear below the QR as manual-entry and staff-verification fallback, but it must not be the only security control if it is guessable.

### 5. Receipt QR: optional, nonessential

A receipt already has a numbered identity and is the record of a completed Sale. The entrance/exit operation needs a Ticket identity, not a Sale/Receipt identity. Adding the ticket QR to a receipt risks staff scanning the wrong document and does not replace the individual one-ticket-per-child artifact.

**Default v1:** no QR on receipts. Include the receipt number and a human-readable lookup/reprint path. A receipt QR is justified only by a specific future workflow, such as staff receipt lookup/reprint, an offline local verification page, or a customer digital-copy URL. If selected, make it a separate opaque receipt token (never reuse the ticket token), avoid PII, define authentication/expiry and offline behavior, and test that receipt scanning cannot accidentally invoke ticket entry/exit.

There is no ISO, GS1, Windows, or browser requirement that ordinary receipts carry a QR. GS1 guidance concerns particular supply-chain/retail barcode applications and must not be misread as a compliance requirement for Kiddy Playground receipts.

### 6. Printable artifact contract

#### Individual child ticket (one artifact per Ticket Line/child)

Required or recommended fields:

- Venue/business name and optional logo; localized language.
- Human-readable ticket code; immutable ticket identity represented by the server-side token.
- Package name, included duration (or "unlimited"), operating-day/issued date and time.
- Ticket deposit and a clear deposit/overtime note only if operationally useful; do not imply deposit is revenue.
- Optional minimal child display label (for matching at the counter) only when venue privacy policy permits; never encode it in QR. Avoid full PII by default.
- QR payload + short text label such as "Scan at entry/exit"; no receipt/payment QR.
- Status/use guidance, and a prominent `REPRINT` marker on reprints.
- One physical ticket/card per child. Do not print a group QR for a multi-ticket sale.

#### Numbered receipt (one artifact per completed Sale)

- Venue/business identity and localized date/time; receipt number; cashier/device as policy permits.
- Itemized Ticket Lines (package, quantity/count, price and deposit presentation) and Product Lines (name, quantity, unit price, line total).
- Discounts/price overrides/complimentary lines represented according to the Sale rules; subtotal, total, currency (IDR/Rp), and one confirmed payment method.
- Deposit cash movement shown separately from revenue where needed by the domain; no invented tax fields or compliance claims.
- Reprint marker, original receipt number, staff/time/reason audit linkage.
- **No receipt QR by default.** If later enabled, specify its opaque receipt token and exact lookup/verification workflow.

The server should return a versioned artifact contract (for example, `ticket-print-v1` and `receipt-print-v1`) with source IDs, render timestamp, locale, and reprint metadata. Rendering must read committed immutable snapshots, not mutable current prices/package settings.

### 7. Generic print acceptance rules and residual risks

A v1 venue acceptance test should require all of the following:

1. Use the confirmed profiles: A4 landscape with four flat ticket strips per sheet, fixed trim marks, no-content safety margin, and compact logical 80 mm receipt output. Use PDF dimensions, one ticket per strip, and forced page breaks so a multi-child sale cannot merge tickets.
2. After commit, expose separate `Print tickets` and `Print receipt` actions. In print preview, show the selected target media and tell the operator to use the intended printer, orientation, margins, and **100%/actual size** (or a documented scale). Never rely on "fit to page" for a QR ticket.
3. Disable browser-added headers/footers and avoid relying on background colors/images. Keep content inside the printer's usable area; W3C notes that non-printable margins are device-dependent.
4. Print at least three consecutive tickets and receipts on every supported media class and on the actual Windows printer/driver. Check no clipping, unwanted scaling, broken IDR/localized text, wrong page breaks, or extra blank pages.
5. QR acceptance is operational, not merely visual: scan every output with each certified entrance/exit device in bright/dim light, at realistic wrist/hand angles, after attachment/tape/folding expected by the venue. Include a human-readable code/manual-entry fallback.
6. Use high-contrast dark modules on a light, matte background; reserve the complete quiet zone; do not place text, graphics, folds, cuts, tape, or wristband seams through the QR. DENSO says a QR Code requires a four-module quiet zone on all sides and that larger modules are more stable/easier to read; it also says scanner readability limits vary by scanner. [DENSO WAVE — QR code area and quiet zone](https://www.qrcode.com/en/howto/code.html), [DENSO WAVE — module size](https://www.qrcode.com/en/howto/cell.html)
7. Do not claim a universal QR millimetre size from retail barcode guidance. GS1's quiet-zone/quality guidance is useful evidence about contrast, modules, and quiet zones, but its retail X-dimension ranges are not automatically applicable to a playground wristband. [GS1 — 2D Barcode Colour & Quality Guide](https://ref.gs1.org/docs/2025/GS1-2D-colour-guide-i10-f-25-02-10)
8. Record every print attempt with source document identity, artifact/render version, operator, time, target medium/printer if known, and outcome `requested`, `dialog-closed/unknown`, `cancelled`, or explicit failure. Reprint is a new audited attempt, visibly marked, with a duplicate warning. Never auto-retry after an unknown browser/native outcome; paper may already exist.
9. Keep print separate from Sale/Ticket commit. A print failure never voids a paid sale or creates a second ticket. The operator can open the original artifact and choose explicit reprint/recovery.
10. Test browser/WebView variants used by the venue, including Save-to-PDF and wrong-paper selection. Camera scanning is a separate acceptance dependency: `getUserMedia()` requires HTTPS (or localhost) and user permission, while `BarcodeDetector` is not a universal browser capability. [MDN — `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN — BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)

### 8. Direct printer integration should be deferred, with a clear trigger

Defer printer-specific direct/raw integration in v1 when the goal is broad Windows-printer support, ordinary paper/bracelet stock, low installation friction, and reliable offline operation. It adds queue discovery, driver/capability handling, host-only native permissions, spooler failure states, printer model support, and a second rendering/dispatch path.

Do not defer it if a venue acceptance test shows that the browser dialog cannot meet required transaction throughput, paper/cutter workflow, or staff ergonomics. In that case, first add a narrowly scoped Windows host queue service (not phone-to-printer access), keep the same server artifact contract, and preserve browser/PDF as fallback. Native status should still be called `queued`/`sent`/`unknown`, not "paper succeeded," because Windows itself documents that completion can precede physical printing.

## Sources

### Kept

- [WHATWG HTML — Printing](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#printing) — normative browser print prompt, PDF/physical-form choice, and `beforeprint`/`afterprint` behavior.
- [MDN — Printing CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) — practical `@media print`, `@page`, and print-event primitives.
- [MDN — `@page` size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page/size) — standard/custom page size and orientation syntax.
- [W3C — CSS Paged Media Level 3](https://www.w3.org/TR/css-page/) — page model and device-dependent non-printable area.
- [Microsoft — Print Spooler](https://learn.microsoft.com/en-us/windows/win32/printdocs/print-spooler) — Windows queue/driver/spooling boundary.
- [Microsoft — Printing from WebView2 apps](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/print) — print UI, silent print, and PDF options for a host later.
- [Microsoft — `JOB_INFO_1`](https://learn.microsoft.com/en-us/windows/win32/printdocs/job-info-1) — explicit warning that "complete/sent" may not mean physically printed.
- [ISO — ISO/IEC 18004:2024](https://www.iso.org/cms/%20render/live/en/sites/isoorg/contents/data/standard/08/33/83389.html) — QR symbology/quality scope; no ticket/receipt semantics.
- [DENSO WAVE — QR code area](https://www.qrcode.com/en/howto/code.html) and [module size](https://www.qrcode.com/en/howto/cell.html) — quiet zone, module-size, printer, and scanner-readability evidence.
- [GS1 — 2D Barcode Colour & Quality Guide](https://ref.gs1.org/docs/2025/GS1-2D-colour-guide-i10-f-25-02-10) — high-contrast/quiet-zone/quality guidance, used without importing retail compliance requirements.
- [MDN — `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) and [BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) — scanner acceptance dependencies.

### Repository evidence inspected

- `specs/spec.md`
- `CONTEXT.md`
- `.scratch/kiddy-playground-v1/issues/01-ticket-and-session-lifecycle.md`
- `.scratch/kiddy-playground-v1/issues/02-sale-payment-and-receipt-rules.md`
- `.scratch/kiddy-playground-v1/issues/10-research-hardware-integration.md`
- `.scratch/kiddy-playground-v1/fog-hardware-packaging.md` (working note, not a resolved issue)

### Dropped

- Vendor printer product pages, marketplace listings, and third-party QR-size tables — cannot establish a venue-supported printer/driver or scanner acceptance class.
- GS1 retail minimum X-dimension tables as a universal ticket requirement — the use case is playground admission, not automatically retail POS or GS1 compliance.
- Generic browser compatibility blogs and SEO print tutorials — lower authority and redundant with WHATWG/MDN/W3C/Microsoft.

## Gaps

- No physical venue test establishes the actual Windows printer/driver, flat-paper stock/coating, exact strip dimensions, 25 mm QR scan reliability, folds/tape placement, compact 80 mm feeding, or certified Android camera/scanner matrix.
- The venue has chosen the PDF-canonical artifact-first baseline: immutable PDFs plus visible Windows/browser printing; native printer integration is deferred unless throughput testing proves it necessary. The remaining gaps are the exact PDF renderer, browser minimum, print-dialog procedure, and physical acceptance.
- Confirmed media direction: child tickets use A4 landscape with four flat strips per sheet, fixed trim marks, fold + clear tape, outer-face QR/code, no child name, and a 25 mm QR target; receipts use one compact logical 80 mm PDF profile with no QR. Physical dimensions, stock/coating, QR scan reliability, folding/tape placement, and 80 mm feeding still require tests.
- No source can decide whether a receipt QR would improve a specific venue workflow. The venue default is no receipt QR; revisit only for a defined lookup, digital-copy, or verification workflow.

No tickets, issues, `map.md`, `CONTEXT.md`, or application code were created or modified.
