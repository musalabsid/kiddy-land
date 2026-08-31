# Desktop (Tauri)

Tauri desktop shell for cashier/scanner/owner devices — same UI as `apps/web` via the shared
`@workspace/ui` components, run inside a native WebKitGTK window.

See the [root README](../README.md) for setup and the [docs](../apps/docs) for device pairing and roles.

## Dev

```sh
bun install
bun --cwd apps/desktop dev        # Vite on http://localhost:1420
bun --cwd apps/desktop tauri dev  # native window (requires Rust toolchain)
```

## Build

```sh
bun build:desktop                 # standalone bundle + Tauri package
```
