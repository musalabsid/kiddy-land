# Form/Input Inventory — kiddy-land

Scope: user-facing forms/inputs in `apps/web/src` + `packages/ui/src`, excluding the **pairing/QR device layout** (`qr-pairing-scanner.tsx`, pairing visuals in `auth-screen.tsx` `PairingScreen`, `device-management.tsx` QR column) from visual changes.

Repo shape: TanStack Router + React 19 + Vite app (`apps/web`), UI kit (`packages/ui`, shadcn/base-ui), server (`packages/server`, hand-rolled validation — **no zod anywhere in repo**), client hooks (`packages/client`).

---

## 1. Shared form primitives

- `packages/ui/src/components/input.tsx` (lines 1-19) — `Input` wrapping `@base-ui/react/input`. **Used by only 1 file: `sidebar.tsx` (SidebarInput, lines 317-327).** Every other form input is a raw `<input>` with inline tailwind classes duplicated per file.
- `packages/ui/src/components/button.tsx` — shared `Button`.
- No form library, no `react-hook-form`, no field/error primitives, no `<label>` component. `Field` helper exists only inside `product-catalog.tsx` (lines 40-43).
- Inline input styles, repeated across files (fragmentation is the norm):
  - `h-9 border border-input bg-background px-2 text-sm` (auth-screen, device-management, product-catalog `inputCls`)
  - `h-10 border border-input bg-background px-3` (calendar-settings, ticket-package-settings, cashier-sale, ticket-scanner)
  - `h-9 border px-2` (sale-refund, membership-discount-settings, membership-dashboard, reports-dashboard, member-picker)

---

## 2. Real `<form>` elements (submit handlers)

| File | Form fields | Required | Submit → mutation |
|---|---|---|---|
| `auth-screen.tsx` `PairingScreen` (line 27-28) | token `<input required>`, mode `<select>` | token required (HTML) | `usePairingMutation` `{token, mode, origin}`. **EXCLUDE from visual changes.** |
| `auth-screen.tsx` `OwnerLoginScreen` (line 56) | password (PasswordField, `required`) | HTML required + button disabled if empty | `useOwnerLoginMutation(password)` |
| `auth-screen.tsx` `BootstrapScreen` (line 67) | password + confirm (PasswordField, `minLength=8`) | 8-char min, match check client-side (`mismatch`) | `useBootstrapMutation(password)`; server also enforces `password.trim().length < 8` (`server/src/identity.ts:71`) |
| `ticket-package-settings.tsx` (line 20) | name `<input required>`, 5 number inputs (includedMinutes optional, rest required), depositPolicy select | HTML required | `useConfigureCalendar({package})`; server `upsertPackage` validates: includedMinutes positive int or null; all amounts non-negative int IDR; `unlimited-cap` policy requires `includedMinutes === null` (`server/src/calendar.ts:47-48`) |
| `public-kiosk.tsx` (line 10) | ticket code input (no `required` attr, button disabled when empty) | implicit | `usePublicTicket.refetch()` |
| `ticket-scanner.tsx` (line 14) | scan code input | button disabled when empty | `useTicketScan(kind).mutate(code.trim())` |

---

## 3. Forms without `<form>` (button-triggered)

### product-catalog.tsx (lines 31-68)
- **Create**: SKU\*, Name\*, Barcode, Price (IDR)\*, Initial stock, Low-stock threshold. Button disabled unless `sku.trim() && name.trim() && price`. `min=0` on numbers, no `required` attr, no HTML5 validation UI.
- **Edit** (inline panel, line 55): SKU, Name, Barcode, Price, Threshold. No gating — `saveEdit` sends whatever's there.
- Server (`server/src/inventory.ts:19-23`): `create` requires sku+name non-empty, **price/stock/threshold must be non-negative integers** (floats rejected), sku/barcode uniqueness; `update` partial, same integer/duplicate rules.
- ⚠️ Client sends `Number(editPrice)` etc. — `""` → `0`, and decimals/negative pass client but get server error.

### member-picker.tsx (lines 8-15)
- Code lookup input + Find button; name + phone inputs + "Find by name/phone" (both must be non-empty — `useSearchMembers` enabled only when both); **Register button** → `useRegisterMember({name, phone})` (server: `membership.ts:21` requires name; phone optional).
- Live query on code (no submit, `useMemberByCode`).

### cashier-sale.tsx (lines 21-40)
- Child name + package select + Add line (button disabled unless both); product SKU/barcode/name + qty `min=1` + Add line; payment method select (cash default) + checkbox "confirm payment" for non-cash; Complete button gated on lines + confirmation.
- Server constraints (`server/src/sale.ts`): `canOperate` — venue closed/outside hours rejects sales; stock reservation (`inventory.ts:28-29`) rejects non-positive qty, archived product, insufficient stock unless owner exception.
- MemberPicker embedded; deactivated member rejected client-side.

### sale-refund.tsx (lines 11-16)
- Per-line Reason input (required — button disabled without it) + disposition select (return-to-stock / damaged-consumed) + Refund button → `useProductRefund` with qty fixed at 1. Server: reason required, valid disposition, positive int qty, idempotency key (`inventory.ts:31`).

### membership-dashboard.tsx (lines 7-13)
- Search input (filter only). Buttons: Reissue (`reason: "Lost card"` hardcoded), Deactivate/Reactivate (hardcoded reasons). Server requires non-empty reason (`membership.ts:25-26`).

### membership-discount-settings.tsx (lines 11-13)
- Per-row number input (IDR discount, `min=0`) + Save → `useConfigureMembershipDiscount`. Server: non-negative integer (`membership.ts:27`).

### inventory-dashboard.tsx (lines 8-16)
- No text inputs; buttons only: Intake +1, Count (submits current stock as count), Approve count. Server: qty positive int, count non-negative int.

### device-management.tsx (lines 9-30)
- Device kind select, staff name + role select (private only), Generate invitation button → `useInvitationMutation` `{origin, kind, staff?}`. Token/QR shown after. **Exclude pairing QR visual from changes; the selects/inputs above are fair game.** Server-side: invitations expire after 60s, staff name optional.

### backup-dashboard.tsx (lines 4-9)
- Restore uses `window.prompt` confirmation (not a real input). Buttons only. Keep in mind for consistency audits but no form fields.

---

## 4. Filter/search-only inputs (no submit, query-driven)

- `reports-dashboard.tsx` (line 11) — from/to date, cashier, payment method, package ID, product ID, member ID text inputs + report kind select; queries refetch on state change (live), CSV/PDF download buttons. All filters optional.
- `public-kiosk.tsx` (line 10) — product search input.
- `membership-dashboard.tsx` — search filter.
- `product-catalog.tsx` (line 54) — debounced search input.
- `cashier-sale.tsx` — debounced product search backing the datalist.

---

## 5. CalendarSettings (calendar-settings.tsx, lines 30-62) — special case

Two cards, no `<form>`:
1. Schedule card: timezone text input, day-picker buttons, open/close `type=time` inputs, closure reason input, Save Schedule button → `configure({timezone, day, hours})`. Server (`calendar.ts:16-17,41-42`): date must match `^\d{4}-\d{2}-\d{2}$`, time `^([01]\d|2[0-3]):[0-5]\d$`, valid timezone; closed-day state uses reason.
2. Override card: date input, kind select, reason input, open/close time (kind=open), period select (kind=pricing), Save Override → `configure({override})`.
- ⚠️ **Validation gaps**: timezone + closureReason inputs have **no required/format validation client-side**; open/close time strings sent raw. Server rejects bad timezone/time, but save can silently roll back (configure is transactional — `calendar.ts:50-62` reverts on error).

---

## 6. API constraints (server-side, authoritative)

| Mutation | Server validation | File:line |
|---|---|---|
| create/update product | sku+name required; price/stock/threshold non-negative **integers**; sku/barcode unique | `server/src/inventory.ts:19-23` |
| register member | name required; duplicate active check | `server/src/membership.ts:21` |
| reissue/deactivate/reactivate | reason required | `membership.ts:25-26` |
| set discount | non-negative integer amount | `membership.ts:27` |
| upsert ticket package | includedMinutes positive int or null; amounts non-negative ints; unlimited-cap ⇒ no includedMinutes | `server/src/calendar.ts:47-48` |
| set weekly hours/override | date/time format regex; valid timezone | `calendar.ts:16-17,40-43` |
| product refund | reason required; disposition enum; qty positive int; idempotency | `inventory.ts:31` |
| inventory intake/count | qty positive int; counted non-negative int | `inventory.ts:24-25` |
| bootstrap | password ≥ 8 chars | `identity.ts:71` |
| complete sale | venue must be open (schedule); stock sufficiency; idempotency key | `sale.ts`, `inventory.ts:28-29` |
| all mutations | `canMutate(connection.state, synchronized)` gate — error "Connection is not synchronized" when offline/read-only | `client/src/members/hooks.ts:12` pattern (all client hooks) |

Client hooks (names/endpoints): `packages/client/src/{sales,members,inventory,calendar,auth,kiosk.ts,backups.ts,notifications.ts}/hooks.ts` + `service.ts`. Auth: `client/src/auth/{service,store}.ts`, `server/src/identity.ts`.

---

## 7. Prioritized recommendations (for the follow-up build task)

1. **Replace raw inputs with shared `Input` + `Field`/`Label` primitives** across all components listed in §2-5 (visual consistency task). Single primitive file: `packages/ui/src/components/input.tsx`; add a `field.tsx` (label + hint + error slot). ~12 files touched.
2. **Standardize required semantics** — use HTML `required` + aria-invalid consistently (product-catalog, cashier-sale, member-picker, sale-refund currently rely on button-disabled only; screen readers get no signal).
3. **Client-side validation parity with server**: add zod (already a dep of `@workspace/ui` v4.4.3) schemas mirroring §6 — integer checks (product price/stock/threshold, discount amounts) and calendar time/date formats. Catches `Number("")===0` and float slips before server round-trip.
4. **Error surfacing**: product-catalog shows generic "Could not create product" swallowing server messages; calendar `configure` rollback is silent to the user (no error alert on rollback). Map mutation errors to field-level or top-level alerts.
5. **Accessibility**: inputs lack aria-invalid/aria-describedby for error text; selects in auth/ticket-scanner lack labels except aria-label in some; consider label association everywhere.
6. Lowest priority: reports-dashboard filter inputs (free-text IDs — consider selects/datalists), backup restore `window.prompt` (not a real field).

## 8. Files likely to change (touch map)

- `packages/ui/src/components/input.tsx` (+ new `field.tsx`)
- `packages/ui/src/components/auth-screen.tsx` (owner login + bootstrap only)
- `packages/ui/src/components/product-catalog.tsx`
- `packages/ui/src/components/ticket-package-settings.tsx`
- `packages/ui/src/components/calendar-settings.tsx`
- `packages/ui/src/components/cashier-sale.tsx`
- `packages/ui/src/components/member-picker.tsx`
- `packages/ui/src/components/sale-refund.tsx`
- `packages/ui/src/components/membership-dashboard.tsx`
- `packages/ui/src/components/membership-discount-settings.tsx`
- `packages/ui/src/components/inventory-dashboard.tsx`
- `packages/ui/src/components/ticket-scanner.tsx`
- `packages/ui/src/components/public-kiosk.tsx`
- `packages/ui/src/components/reports-dashboard.tsx`
- `packages/ui/src/components/device-management.tsx` (selects/inputs only, not QR column)
- `apps/web/src/routes/**` — thin wrappers (RouteAccessGate + component), **no form logic; likely untouched**.
