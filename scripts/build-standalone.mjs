#!/usr/bin/env bun
// Standalone production build: web + server binary + Tauri bundle
// Usage:
//   bun run build:standalone        # prepare web + server binary (fast, no Rust compile)
//   bun run build:standalone --tauri # + cargo tauri build (produces .msi/.deb)
//   In GitHub Actions: just run `bun run build:standalone --tauri`

import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TAURI = process.argv.includes("--tauri");
const isWin = process.platform === "win32";
const triple = isWin ? "x86_64-pc-windows-msvc" : "x86_64-unknown-linux-gnu";
const ext = isWin ? ".exe" : "";

async function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  await $`${{ raw: cmd }}`.nothrow();
}

console.log("=== Kiddy Land standalone build ===");
console.log(`platform: ${process.platform}  triple: ${triple}  tauri: ${TAURI}`);

console.log("\n[1/3] Building web (apps/web)...");
await $`bun --cwd apps/web build`;

console.log("\n[2/3] Compiling server (packages/server/src/host.ts) -> Tauri sidecar...");
const binDir = "apps/desktop/src-tauri/binaries";
mkdirSync(binDir, { recursive: true });
const outBase = join(binDir, `kiddy-land-server-${triple}${ext}`);
// Remove old binaries to avoid stale triple
await $`rm -f ${binDir}/kiddy-land-server-*`.nothrow();

// bun build --compile needs an entry that is self-contained.
// host.ts imports supervisor.ts which pulls sqlite etc. -- bun handles it.
console.log(`  compiling to ${outBase} ...`);
await $`bun build --compile --minify --sourcemap packages/server/src/host.ts --outfile ${outBase}`;

// Tauri externalBin expects file without triple in config, but file WITH triple on disk.
// Create also a copy without triple for local `tauri dev` sidecar resolution (optional)
await $`cp ${outBase} ${binDir}/kiddy-land-server${ext}`.nothrow();
const sz = (await Bun.file(outBase).arrayBuffer()).byteLength;
console.log(`  ✓ ${outBase} (${sz} bytes)`);

if (!TAURI) {
  console.log("\n[3/3] Skipped Tauri bundle (use --tauri to build installer)");
  console.log("  Prepare done. Run `bun --cwd apps/desktop tauri build` or `bun run build:standalone --tauri` to produce installer.");
  process.exit(0);
}

console.log("\n[3/3] Building Tauri bundle (cargo tauri build) — this takes ~3-6 min ...");
await $`bun --cwd apps/desktop tauri build`;

console.log("\n=== Done ===");
console.log(isWin
  ? "  Windows installer: apps/desktop/src-tauri/target/release/bundle/msi/*.msi"
  : "  Linux bundle: apps/desktop/src-tauri/target/release/bundle/deb/*.deb , AppImage/*.AppImage");
