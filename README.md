# Kiddy Land

A cozy corner of the internet built for curious kids — venue management for indoor playgrounds:
ticketing, scanning, kiosk, cashier, reports, membership, inventory, and sound alerts when
play time is almost over.

Monorepo managed with [Turborepo](https://turborepo.dev) and [Bun](https://bun.sh).

> **Full guides:** live docs in [`apps/docs`](apps/docs) — run `bun docs:dev`. Covers pairing,
> roles, scanner, reports, customization, and more (English + Indonesian).

## Stack

- **`apps/web`** — the main app: [Vite](https://vite.dev) + [React 19](https://react.dev) + [TanStack Router](https://tanstack.com/router) + [Tailwind CSS v4](https://tailwindcss.com)
- **`apps/desktop`** — [Tauri](https://tauri.app) desktop shell for cashier/scanner devices (same UI as web)
- **`apps/docs`** — [VitePress](https://vitepress.dev) docs site (guide + id/guide)
- **`packages/server`** (`@kiddy-land/server`) — Hono host runtime: REST API, WebSocket realtime, ticketing lifecycle, sale store, calendar, inventory, membership, backups, sound alerts
- **`packages/client`** (`@kiddy-land/client`) — API client, React hooks, auth store, realtime bridge, alert sound (bell + voiced `speechSynthesis`)
- **`packages/ui`** (`@workspace/ui`) — shared component library built with [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com), icons from [lucide-react](https://lucide.dev)
- **`packages/localization`** — `en`/`id` locale messages + `useLocale`/`t()` for user-facing strings

## Getting started

Requires [Bun](https://bun.sh) (see `devEngines` in `package.json`).

```sh
bun install
bun dev
```

- **Web app** — http://localhost:3000
- **Server host** — http://localhost:43117 (HTTP), https://localhost:43118 (HTTPS)
- **Desktop shell** — `bun --cwd apps/desktop dev` (Vite on http://localhost:1420, `tauri dev` for the native window)
- **Docs** — `bun docs:dev` → http://localhost:5173

The server + devices pair over the LAN — see [Pairing](apps/docs/guide/pairing.md) in the docs.

## Scripts

| Command                | Description                            |
| ---------------------- | -------------------------------------- |
| `bun dev`              | Start all dev servers                  |
| `bun build`            | Build all apps and packages            |
| `bun check-types`      | Type-check all workspaces              |
| `bun lint`             | Lint the whole repo                    |
| `bun lint:fix`         | Lint and autofix                       |
| `bun format`           | Check formatting                       |
| `bun format:fix`       | Format everything                      |
| `bun quality`          | Run lint + format checks               |
| `bun quality:fix`      | Autofix lint and format                |
| `bun docs:dev`         | Run docs site locally                  |
| `bun docs:build`       | Build docs site                        |
| `bun build:desktop`    | Build standalone + Tauri desktop bundle |

Target a single workspace with a [Turbo filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```sh
bun turbo dev --filter=web
bun turbo build --filter=@workspace/ui
```
