# Settings Architecture — kiddy-land

> Design-only. No code in this doc. Ponytail = shortest diff that holds.

## 1. Goal

Single place for *preferences* (render/behavior) without scattering controls in `SidebarFooter` and without touching *management* entities (catalog, inventory, memberships, packages — those stay standalone owner pages).

Two-tier access:

- **Personal** — every authenticated device: appearance, language, sound.
- **Venue** — Owner only: notification routing, calendar/venue hours, system (devices + backups).

## 2. Route

**One route, not two.**

```
apps/web/src/routes/_authenticated/_shell/settings.tsx
  -> Route.createFileRoute("/_authenticated/_shell/settings")
     validateSearch: { tab?: "appearance"|"notifications"|"venue"|"system" }
```

- Path: `/settings` (inside `_shell`, so `AppShell` chrome remains).
- Guard: `RouteAccessGate` with **no** `requireRole` — page itself is open to all roles. Each section gates internally via `useRouteAccess().isOwner`.
- Deep-link: `?tab=venue` etc. Default `appearance` for non-Owners, `appearance` for Owners too (prevents redirect flash).
- Back-compat: existing owner pages (`/owner/calendar`, `/owner/devices`, `/owner/backups`) stay routable. Settings tabs **reuse** their components via import, not rewrite. Old URLs get a `Link` note "also in Settings → Venue/System" — no redirect yet, remove after adoption.

Why not `owner/settings`? Cashier/Scanner need personal prefs; nesting under `owner` would 403 them. One route solves both.

## 3. Sidebar

Add one item, always visible, below role groups:

```tsx
// packages/ui/src/components/app-shell.tsx — after Owner group
<SidebarGroup>
  <SidebarGroupContent>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link to="/settings" />} isActive={active("/settings")}>
          <Settings2 />{t("app.settings")}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

- `app.settings` key added to localization (en: "Settings", id: "Pengaturan").
- Keep footer quick-toggles (sound, locale, theme, logout) for now — Settings is the full control, footer stays as shortcut. Deprecate footer duplication only after usage confirms.

## 4. UI Composition — fewest files

```
packages/ui/src/components/settings/
  settings-shell.tsx      # shell + tab nav + isOwner gating (~120 lines)
  appearance-section.tsx  # theme + locale + sound toggles
  notifications-section.tsx # sound + per-kind routes (Owner)
  venue-section.tsx       # thin wrapper around existing CalendarSettings
  system-section.tsx      # cards linking to /owner/devices, /owner/backups
```

Ponytail-allowed collapse: if total <300 lines, merge into single `settings.tsx` with internal `AppearanceSection` etc. functions — not 5 files for ceremony. Start as one file, split only when >300 lines.

`settings-shell.tsx` sketch:

```tsx
export function SettingsShell() {
  const { isOwner } = useRouteAccess();
  const { tab } = Route.useSearch(); // or useSearch from tanstack
  const tabs = [
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    ...(isOwner ? [
      { id: "venue", label: t("settings.venue"), icon: CalendarDays },
      { id: "system", label: t("settings.system"), icon: HardDrive },
    ] : []),
  ];
  // layout: left nav (240px) + right pane, stacked on mobile
}
```

Layout pattern: reuse `Card` + `CardHeader` + `CardContent` already used by `calendar-settings.tsx`/`backup-dashboard.tsx`. Left vertical tab list mirrors `sidebar` style, not a new design system — `Button variant={active?"secondary":"ghost"}`.

## 5. Sections Detail

### 5.1 Appearance (all roles) — localStorage, no server

| Control | Source | Persist |
|---------|--------|---------|
| Theme `light/dark/system` | `useTheme()` from `packages/ui/providers/theme-provider.tsx` | `localStorage` via provider |
| Language `en/id` | `useLocale()` from `@workspace/ui/lib/i18n` | `localStorage` via `LocaleProvider` |
| Sound on/off | `useNotificationSound()` from `notification-alerts.tsx` | server `PATCH /notifications/settings` + optimistic local |

No new hooks. Import existing providers directly. UI: `Select` for theme (3 options), `Button` toggle for locale, `Switch` for sound (`packages/ui/src/components/switch.tsx` exists).

### 5.2 Notifications (sound for all, routing for Owner)

- Sound toggle: same `useNotificationSound()` as 5.1 — single source, no duplicate state.
- Routes (Owner): `GET /notifications/routes`, `PATCH /notifications/routes/:kind` — `notifications.ts` already implements `defaultRoutes` + `configureRoutes(kind, modes)`. UI = 4 rows (one per `NotificationKind`) with multi-select of `DeviceMode[]` (checkbox group, exclude Public Kiosk — server already throws). Use existing `useQuery`/`useMutation` pattern from `packages/client` (add `notifications/hooks.ts` if not present — 2 hooks, ~20 lines).

Validation: server enforces `Public Kiosk cannot receive private notifications` and `defaultRoutes[kind]` existence — no client-side duplication beyond disabling the Kiosk checkbox.

### 5.3 Venue (Owner) — reuse, don't rebuild

```tsx
function VenueSection() {
  return <CalendarSettings /> // import from existing component
}
```

`CalendarSettings` already handles `useCalendarConfig`, `useConfigureCalendar`, zod form, overrides. No new API. Wrapping in a `Card` with `settings.venueDescription` header is enough. Future venue prefs (e.g., deposit defaults) extend here, not new pages.

### 5.4 System (Owner) — link-out, not re-implement

```tsx
function SystemSection() {
  return (
    <div className="grid gap-4">
      <Card><CardHeader><CardTitle>{t("app.devices")}</CardTitle></CardHeader>
        <CardContent><Link to="/owner/devices"><Button>{t("settings.manageDevices")}</Button></Link></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("app.backups")}</CardTitle></CardHeader>
        <CardContent><Link to="/owner/backups"><Button>{t("settings.manageBackups")}</Button></Link></CardContent></Card>
    </div>
  );
}
```

Rationale: `DeviceManagement` and `BackupDashboard` are complex (QR pairing, restore staging). Embedding them inside tabs would force scroll/height hacks. Link-out keeps diff minimal and avoids double-maintaining. If later we embed, it's a one-line swap.

## 6. Client / Server Touch Points

- **No new server routes** for v1. Reuse:
  - `GET/PATCH /notifications/settings`
  - `GET/PATCH /notifications/routes` (+ `/:kind`)
  - `GET /calendar/config`, `POST /calendar/configure`
  - `GET /backups`, `POST /backups`, `DELETE /backups/:id` (linked, not tab-embedded)
- **Client hooks**: add only if missing:
  - `packages/client/src/notifications/hooks.ts` → `useNotificationSettings`, `useNotificationRoutes`, `useUpdateNotificationRoute` (thin wrappers over `useClient()` + `useQuery`/`useMutation` matching `backups` pattern).
- **Persistence note**: `notifications.ts` stores `settings` Map in-memory. Survives HMR but not server restart. Flag `ponytail: in-memory notification settings, persist to sqlite via database-schema if restart loss reported` — don't add schema now.

## 7. Localization

Add to `packages/localization/locales/{en,id}.json` in same commit:

```json
{
  "app.settings": "Settings",
  "settings.appearance": "Appearance",
  "settings.appearanceDescription": "Theme and language for this device.",
  "settings.notifications": "Notifications",
  "settings.notificationsDescription": "Sound and where alerts are delivered.",
  "settings.venue": "Venue",
  "settings.venueDescription": "Calendar, hours, and venue-wide preferences.",
  "settings.system": "System",
  "settings.systemDescription": "Devices and backups.",
  "settings.theme": "Theme",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.themeSystem": "System",
  "settings.language": "Language",
  "settings.sound": "Sound",
  "settings.soundDescription": "Play a tone when an alert arrives.",
  "settings.manageDevices": "Manage devices",
  "settings.manageBackups": "Manage backups",
  "settings.ownerOnly": "Owner only"
}
```

Plus `id.json` equivalents.

## 8. What NOT to build (YAGNI)

- No new form library, no `react-hook-form` for appearance — toggles only.
- No `settings` DB table, no zod schema for settings payload — reuse existing validation in `notifications.ts`/`calendar.ts`.
- No role editor, no custom permissions — `Role` is fixed v1 per `spec.md` (Owner/Cashier/Staff, extensible later).
- No per-user profiles page — `session.user` display stays in header, settings don't duplicate it.
- No Tauri/desktop-specific settings (server origin, TLS) — those belong to `apps/desktop`, not web settings.
- No search inside settings, no keyboard shortcuts.

## 9. File Checklist (minimal)

- [ ] `apps/web/src/routes/_authenticated/_shell/settings.tsx` — route file (20 lines)
- [ ] `packages/ui/src/components/settings/settings-shell.tsx` — shell + tabs (+ sections inline or split)
- [ ] `packages/localization/locales/en.json` + `id.json` — `settings.*` + `app.settings`
- [ ] `packages/ui/src/components/app-shell.tsx` — add Settings nav item
- [ ] (if needed) `packages/client/src/notifications/hooks.ts` — 2 hooks for routes
- [ ] Keep: `calendar-settings.tsx`, `backup-dashboard.tsx`, `device-management.tsx` — unchanged, imported not forked

## 10. Upgrade Path (when to add)

- More venue prefs → extend `VenueSection` with new `Card`s, add server route if authoritative.
- Persist notification settings → add `notification_settings` table, hydrate `Map` from DB on boot.
- Embed devices/backups inline → replace `SystemSection` link cards with direct component renders.
- Per-user settings (if multi-user device) → add `userId` scoping to notification settings + theme/locale per user (currently per-device localStorage).

## 11. Alternatives Considered (one line each)

- `owner/settings` nested under owner: rejected — Cashier/Scanner can't reach personal prefs.
- Nested file routes `settings/appearance.tsx` etc.: rejected — 4 extra route files for toggles, `?tab=` is one file.
- Dedicated `settings` server service + table: rejected — reuses existing notification/calendar stores, no new persistence until needed.
