# Web app

Main Kiddy Land app: Vite + React 19 + TanStack Router + Tailwind CSS v4. Serves the owner
dashboard, cashier, scanner, and public kiosk.

See the [root README](../README.md) for setup and the [docs](../apps/docs) for guides.

## Dev

```sh
bun install
bun --cwd apps/web dev   # http://localhost:3000
```

## Routing

TanStack file-based routing in `src/routes`. Route files are generated; the desktop app mirrors
them in `apps/desktop/src/routes.gen.tsx`.

## Server origin

The client connects to the host server at `http://127.0.0.1:43117` by default (or the same
origin over HTTPS). Override with `VITE_LOCAL_SERVER_ORIGIN` — see `src/lib/origin.ts`.
