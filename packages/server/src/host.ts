import { detectLanIpv4 } from "./lan.ts";
import { createHostRuntime } from "./supervisor.ts";

const dataDir =
  process.env.KIDDY_LAND_DATA_DIR ??
  `${process.env.APPDATA ?? process.cwd()}/KiddyLand`;
const host = process.env.KIDDY_LAND_HOST ?? "127.0.0.1";
const port = Number(process.env.KIDDY_LAND_PORT ?? "43117");
const httpsPort =
  process.env.KIDDY_LAND_HTTPS === "1" ||
  process.env.KIDDY_LAND_HTTPS === "true"
    ? Number(process.env.KIDDY_LAND_HTTPS_PORT ?? "43118")
    : undefined;
const detectedLanIp = detectLanIpv4();
const tlsHosts = (process.env.KIDDY_LAND_TLS_HOSTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (tlsHosts.length === 0 && detectedLanIp) tlsHosts.push(detectedLanIp);
if (
  process.env.KIDDY_LAND_TLS_HOSTS &&
  !tlsHosts.includes(detectedLanIp ?? "") &&
  detectedLanIp
)
  console.warn(
    `KIDDY_LAND_TLS_HOSTS set but does not include detected LAN IP ${detectedLanIp}; cert will not cover it`,
  );
// Serve the built web app from the HTTPS listener by default when the dist
// directory exists, so the phone gets app + API + WebSocket on ONE secure
// origin. Set KIDDY_LAND_WEB_DIST=0 to disable. The dist must be built:
// bun --cwd apps/web build
const webDistCandidate = process.cwd().endsWith("packages/server")
  ? "../../apps/web/dist"
  : "apps/web/dist";
const webDist = (() => {
  const raw = process.env.KIDDY_LAND_WEB_DIST;
  if (raw === "0" || raw === "false") return undefined;
  const explicit = raw && raw !== "1" && raw !== "true" ? raw : undefined;
  if (explicit) return explicit;
  const { existsSync } = require("node:fs");
  return existsSync(webDistCandidate) ? webDistCandidate : undefined;
})();
const runtime = createHostRuntime({
  dataDir,
  host,
  port,
  httpsPort,
  tlsHosts,
  webDist,
});

await runtime.start();
console.log(
  JSON.stringify({
    type: "ready",
    origin: runtime.server.url,
    httpsUrl: runtime.server.httpsUrl,
    tlsFingerprint: runtime.server.tlsFingerprint,
    lanIp: detectedLanIp,
    webDist: webDist ?? null,
  }),
);

process.stdin.setEncoding("utf8");
process.stdin.on("data", (command) => {
  if (command.toString().trim() === "stop") void stop();
});

async function stop() {
  await runtime.stop();
  process.exit(0);
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
await new Promise<void>(() => undefined);
