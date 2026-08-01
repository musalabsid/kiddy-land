import { createHostRuntime } from "./supervisor.ts";

const dataDir = process.env.KIDDY_LAND_DATA_DIR ?? `${process.env.APPDATA ?? process.cwd()}/KiddyLand`;
const host = process.env.KIDDY_LAND_HOST ?? "127.0.0.1";
const port = Number(process.env.KIDDY_LAND_PORT ?? "43117");
const runtime = createHostRuntime({ dataDir, host, port });

await runtime.start();
console.log(JSON.stringify({ type: "ready", origin: runtime.server.url }));

process.stdin.setEncoding("utf8");
process.stdin.on("data", (command) => { if (command.toString().trim() === "stop") void stop(); });

async function stop() {
  await runtime.stop();
  process.exit(0);
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
await new Promise<void>(() => undefined);
