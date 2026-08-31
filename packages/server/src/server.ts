import { serve, type ServerType } from "@hono/node-server";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { join } from "node:path";
import { WebSocketServer } from "ws";

import type { HealthReport } from "./app.ts";
import { createApp } from "./app.ts";
import { createBackupService, type BackupService } from "./backup.ts";
import { createCalendarStore, type CalendarStore } from "./calendar.ts";
import { createConnectionRegistry } from "./connection.ts";
import { openLocalDatabase, type LocalDatabase } from "./database.ts";
import { createIdentityStore, type IdentityStore } from "./identity.ts";
import { createInventoryStore, type InventoryStore } from "./inventory.ts";
import { detectLanIpv4 } from "./lan.ts";
import { createLifecycleStore, type LifecycleStore } from "./lifecycle.ts";
import { createMembershipStore, type MembershipStore } from "./membership.ts";
import {
  createNotificationService,
  type NotificationService,
} from "./notifications.ts";
import { publishReportEvent } from "./realtime.ts";
import { createReportService, type ReportService } from "./reports.ts";
import { createSaleStore, type SaleStore } from "./sale.ts";
import { loadOrCreateTls, type TlsConfig } from "./tls.ts";
import {
  createVenueSettingsStore,
  type VenueSettingsStore,
} from "./venue-settings.ts";

export type LocalServerOptions = {
  dataDir: string;
  host?: string;
  port?: number;
  /** When set, also bind an HTTPS listener on this port using the persisted local self-signed certificate. */
  httpsPort?: number;
  /** Hosts to cover in the generated certificate SANs (beyond localhost/127.0.0.1). */
  tlsHosts?: string[];
  /** Optional: serve the built web app (apps/web/dist) from the HTTPS listener. */
  webDist?: string;
  schemaVersion?: number;
  identity?: IdentityStore;
  calendar?: CalendarStore;
  sales?: SaleStore;
  lifecycle?: LifecycleStore;
  inventory?: InventoryStore;
  membership?: MembershipStore;
  reports?: ReportService;
  notifications?: NotificationService;
  backups?: BackupService;
  venueSettings?: VenueSettingsStore;
  database?: LocalDatabase;
  restorePrepared?: (id: string) => Promise<unknown>;
};

export type LocalServer = {
  app: ReturnType<typeof createApp>;
  health: () => HealthReport;
  start: () => Promise<void>;
  stop: (timeoutMs?: number) => Promise<void>;
  url: string;
  /** Set when the HTTPS listener is enabled. */
  httpsUrl?: string;
  /** Certificate fingerprint (sha256, colon-separated) of the local TLS cert. */
  tlsFingerprint?: string;
  restorePrepared: (id: string) => Promise<unknown>;
  replacePrepared: (id: string) => Promise<unknown>;
  setRecoveryBlocked: (blocked: boolean, diagnostic?: string) => void;
};

async function serveStaticFromDist(
  pathname: string,
  dist: string,
): Promise<Response | undefined> {
  const safe = pathname === "/" ? "index.html" : pathname.replace(/^\.\//, "");
  const candidate = join(dist, safe.replace(/^\//, ""));
  try {
    const info = await stat(candidate);
    if (!info.isFile()) return undefined;
    const body = await readFile(candidate);
    return new Response(body, {
      headers: { "Content-Type": contentTypeOf(candidate) },
    });
  } catch {
    return undefined;
  }
}

function contentTypeOf(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff2: "font/woff2",
    woff: "font/woff",
    txt: "text/plain",
  };
  return types[ext] ?? "application/octet-stream";
}

function now() {
  return Date.now();
}

export function createLocalServer(options: LocalServerOptions): LocalServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 43117;
  const httpsPort = options.httpsPort;
  const schemaVersion = options.schemaVersion ?? 8;
  const startedAt = now();
  let status: HealthReport["status"] = "starting";
  let databaseStatus: HealthReport["database"] = "unhealthy";
  let writeBlocked = false;
  let diagnostic: string | undefined;
  let httpServer: ServerType | undefined;
  let httpsServer: ServerType | undefined;
  let tlsMaterial: Awaited<ReturnType<typeof loadOrCreateTls>> | undefined;
  const health = (): HealthReport => ({
    status,
    service: "local-server",
    schemaVersion,
    database: databaseStatus,
    writeBlocked,
    diagnostic,
    uptimeMs: Math.max(0, now() - startedAt),
  });
  const registry = createConnectionRegistry();
  const ownsDatabase = !options.database;
  const database =
    options.database ??
    openLocalDatabase(`${options.dataDir}/kiddy-land.sqlite`);
  const identity =
    options.identity ??
    createIdentityStore({
      database,
      events: { deviceRevoked: (deviceId) => registry.closeDevice(deviceId) },
    });
  const calendar = options.calendar ?? createCalendarStore({ database });
  const inventory = options.inventory ?? createInventoryStore(database);
  const membership = options.membership ?? createMembershipStore(database);
  const venueSettings =
    options.venueSettings ?? createVenueSettingsStore(database);
  const sales =
    options.sales ??
    createSaleStore(
      calendar,
      database,
      inventory,
      membership,
      () => venueSettings.get().maxTicketsPerSale,
    );
  const lifecycle =
    options.lifecycle ?? createLifecycleStore(sales, calendar, database);
  const reports =
    options.reports ??
    createReportService(
      calendar,
      sales,
      lifecycle,
      inventory,
      membership,
      identity,
    );
  const notifications =
    options.notifications ??
    createNotificationService(
      identity,
      registry,
      lifecycle,
      inventory,
      venueSettings,
    );
  const backups =
    options.backups ??
    createBackupService(database, `${options.dataDir}/backups`, schemaVersion);
  const notificationTimer = setInterval(() => notifications.check(), 30_000);
  const intervalMs = (v: string) =>
    v === "6h"
      ? 6 * 60 * 60 * 1000
      : v === "12h"
        ? 12 * 60 * 60 * 1000
        : v === "daily"
          ? 24 * 60 * 60 * 1000
          : v === "weekly"
            ? 7 * 24 * 60 * 60 * 1000
            : 0;
  let backupTimer: ReturnType<typeof setInterval> | undefined;
  const startBackupTimer = () => {
    if (backupTimer) clearInterval(backupTimer);
    const ms = intervalMs(venueSettings.get().backupInterval);
    if (ms)
      backupTimer = setInterval(() => {
        void backups.backup("auto-daily").catch(() => {});
      }, ms);
  };
  startBackupTimer();
  setInterval(() => {
    try {
      const now = new Date();
      for (const offset of [0, -1]) {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        const date = calendar.operatingDate(d);
        const time = calendar.operatingTime(now);
        const schedule = calendar.effectiveSchedule(date);
        if ("closed" in schedule.hours) continue;
        const closeMin =
          Number(schedule.hours.close.slice(0, 2)) * 60 +
          Number(schedule.hours.close.slice(3));
        const nowMin = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
        const graceEnd = closeMin + 60;
        // only auto-close after grace, and only if now is after grace ( handles midnight wrap)
        const shouldClose = offset === 0 ? nowMin >= graceEnd : true;
        if (!shouldClose) continue;
        const hasTickets = [...sales.sales.values()].some(
          (sale) =>
            sale.operatingDate === date &&
            sale.tickets.some(
              (t) => t.status === "waiting" || t.status === "active",
            ),
        );
        if (!hasTickets) continue;
        const result = lifecycle.close(date, Date.now());
        if (result.length)
          console.log(
            `[auto-close] ${date} settled ${result.length} tickets after grace`,
          );
      }
    } catch {}
  }, 60_000);
  // Sound alert: check active tickets remaining == threshold (default 5) every 15s, broadcast to alertDevices
  const alertNotified = new Map<string, number>();
  let lastAlertAt = 0; // stagger only for back-to-back alerts; gap long enough -> next fires immediately
  setInterval(() => {
    try {
      const cfg = venueSettings.get();
      // Either alert type can be enabled independently — run if at least one is on
      if (!cfg.alertEnabled && !cfg.alertEndedEnabled) return;
      const threshold = cfg.alertThreshold;
      const allowedModes = new Set(
        cfg.alertDevices.map((d: string) =>
          d === "Kiosk"
            ? "Public Kiosk"
            : d === "Owner"
              ? "Owner Dashboard"
              : d,
        ),
      );
      const today = calendar.operatingDate(new Date());
      const now = Date.now();
      const minutesBetween = (a: number, b: number) =>
        Math.max(0, Math.floor((b - a) / 60000));
      if (cfg.alertEnabled) {
        for (const sale of sales.sales.values()) {
          if (sale.operatingDate !== today) continue;
          for (const ticket of sale.tickets) {
            const session = lifecycle.sessions.get(ticket.id) as
              | { enteredAt: number; status: string }
              | undefined;
            if (!session || session.status !== "active" || !session.enteredAt)
              continue;
            const included = ticket.package.includedMinutes;
            if (included === null) continue;
            const elapsed = minutesBetween(session.enteredAt, now);
            const remaining = included - elapsed;
            if (remaining === null || remaining > threshold || remaining < 0)
              continue; // trigger once when 5..0
            const key = `${sale.operatingDate}:${ticket.id}:${threshold}`;
            if (alertNotified.has(key)) continue;
            alertNotified.set(key, now);
            // collect for staggered broadcast 15s apart (ponytail: avoid overlapping TTS)
            (globalThis as any).__alertQueue =
              (globalThis as any).__alertQueue ?? [];
            (globalThis as any).__alertQueue.push({
              dailyNumber: (ticket as any).dailyNumber ?? ticket.code,
              childName: (ticket as any).childName,
              threshold,
              ticketId: ticket.id,
              allowedModes,
            });
          }
        }
      }
      const queue: Array<{
        dailyNumber: string;
        threshold: number;
        ticketId: string;
        allowedModes: Set<string>;
        childName?: string;
        ended?: boolean;
      }> = (globalThis as any).__alertQueue ?? [];
      (globalThis as any).__alertQueue = [];
      queue.forEach((item) => {
        const delay = Math.max(0, lastAlertAt + 15_000 - Date.now());
        lastAlertAt = Date.now() + delay;
        setTimeout(() => {
          const payload = item.ended
            ? {
                type: "alert",
                kind: "ended",
                dailyNumber: item.dailyNumber,
                childName: item.childName,
                nameCalling: cfg.nameCalling,
                threshold: 0,
                ticketId: item.ticketId,
                textDefault: cfg.alertEndedTextDefault,
                textName: cfg.alertEndedTextName,
              }
            : {
                type: "alert",
                kind: "5min",
                dailyNumber: item.dailyNumber,
                childName: item.childName,
                nameCalling: cfg.nameCalling,
                threshold: item.threshold,
                ticketId: item.ticketId,
                textDefault: cfg.alertTextDefault,
                textName: cfg.alertTextName,
              };
          let sent = false;
          for (const [deviceId, info] of (
            identity as any
          ).devices?.entries?.() ?? []) {
            const mode = (info as any).mode as string;
            const allowed =
              item.allowedModes.has(mode) ||
              (mode === "Public Kiosk" &&
                item.allowedModes.has("Public Kiosk"));
            if (!allowed) continue;
            try {
              (registry as any)?.sendDevice?.(deviceId, payload);
              sent = true;
            } catch {}
          }
          if (sent)
            console.log(
              `[alert] ticket ${item.dailyNumber} ${item.threshold}m left (staggered ${delay / 1000}s)`,
            );
        }, delay);
      });
      // Session ended: alert once when time is up (elapsed >= included), active session only
      if (cfg.alertEndedEnabled) {
        for (const sale of sales.sales.values()) {
          if (sale.operatingDate !== today) continue;
          for (const ticket of sale.tickets) {
            const session = lifecycle.sessions.get(ticket.id) as
              | { enteredAt: number; status: string }
              | undefined;
            if (!session || session.status !== "active" || !session.enteredAt)
              continue;
            const included = ticket.package.includedMinutes;
            if (included === null) continue;
            const elapsed = minutesBetween(session.enteredAt, now);
            if (elapsed < included) continue;
            const key = `${sale.operatingDate}:${ticket.id}:ended`;
            if (alertNotified.has(key)) continue;
            alertNotified.set(key, now);
            (globalThis as any).__alertQueue =
              (globalThis as any).__alertQueue ?? [];
            (globalThis as any).__alertQueue.push({
              dailyNumber: (ticket as any).dailyNumber ?? ticket.code,
              childName: (ticket as any).childName,
              threshold: 0,
              ticketId: ticket.id,
              allowedModes,
              ended: true,
            });
          }
        }
      }
      // cleanup old keys (>24h)
      for (const [k, v] of alertNotified)
        if (now - v > 24 * 60 * 60 * 1000) alertNotified.delete(k);
    } catch {}
  }, 15_000);
  const backupLoaded = backups.load();
  const replacePrepared = (id: string) => backups.replacePrepared(id);
  const restorePrepared =
    options.restorePrepared ??
    (async () => {
      throw new Error("Restore requires the Host Runtime restart coordinator");
    });
  const setRecoveryBlocked = (blocked: boolean, reason?: string) => {
    writeBlocked = blocked;
    diagnostic = reason;
    if (blocked) status = "unhealthy";
    else if (databaseStatus === "ready") status = "ready";
  };
  const getLanIp = () => detectLanIpv4();
  const app = createApp(
    health,
    identity,
    {
      origin: `http://${host}:${port}`,
      registry,
      httpsUrl: () =>
        httpsPort && tlsMaterial ? `https://${host}:${httpsPort}` : undefined,
      lanIp: getLanIp,
    },
    calendar,
    sales,
    lifecycle,
    inventory,
    membership,
    reports,
    notifications,
    backups,
    restorePrepared,
    setRecoveryBlocked,
    options.dataDir,
    venueSettings,
    () => startBackupTimer(),
  );
  publishReportEvent(registry, {
    type: "report-changed",
    source: "server-ready",
  });
  const websocketServer = new WebSocketServer({ noServer: true });

  const fetchWithWebDist = options.webDist
    ? async (request: Request, env?: unknown) => {
        const url = new URL(request.url);
        const staticResponse = await serveStaticFromDist(
          url.pathname,
          options.webDist!,
        );
        if (staticResponse) return staticResponse;
        const apiResponse = await app.fetch(request, env);
        // Vite's SPA routes (/sales, /inventory, …) are client-side routes.
        // Serve index.html on an otherwise-unmatched GET so browser refreshes
        // do not become server 404s. Real API responses keep their status.
        const isKnownGetApiPath =
          /^(\/ready|\/health|\/overview|\/auth\/(bootstrap-status|session|capability\/[^/]+)|\/pairing\/devices|\/products(?:\/[^/]+(?:\/image)?)?|\/inventory\/(movements|low-stock|exceptions|counts)|\/members(?:\/[^/]+)?|\/membership\/(events|discounts)|\/calendar\/(config|schedule|packages\/[^/]+\/snapshot)|\/notifications\/(settings|routes)|\/reports\/(financial|playground|inventory|membership|live)|\/backups|\/venue\/settings|\/public\/venue)$/.test(
            url.pathname,
          );
        if (
          request.method === "GET" &&
          apiResponse.status === 404 &&
          !isKnownGetApiPath &&
          !url.pathname.includes(".")
        ) {
          return (
            (await serveStaticFromDist("/", options.webDist!)) ?? apiResponse
          );
        }
        return apiResponse;
      }
    : app.fetch;
  async function startHttps() {
    if (!httpsPort || tlsMaterial) return;
    const tls: TlsConfig = {
      dir: `${options.dataDir}/tls`,
      hosts: options.tlsHosts,
    };
    const material = await loadOrCreateTls(tls);
    tlsMaterial = material;
    // Same Hono app and same WebSocket server as the HTTP listener: CORS, /ws
    // routing, and origin validation are therefore identical on both protocols.
    await new Promise<void>((resolve, reject) => {
      try {
        httpsServer = serve(
          {
            fetch: fetchWithWebDist,
            hostname: host,
            port: httpsPort,
            createServer: createHttpsServer,
            serverOptions: { key: material.key, cert: material.cert },
            websocket: { server: websocketServer },
          },
          (info) => {
            if (info.port !== httpsPort)
              return reject(
                new Error(
                  `Local Server bound unexpected HTTPS port ${info.port}`,
                ),
              );
            resolve();
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  return {
    app,
    health,
    url: `http://${host}:${port}`,
    restorePrepared,
    replacePrepared,
    setRecoveryBlocked,
    get httpsUrl() {
      return httpsPort && tlsMaterial
        ? `https://${host}:${httpsPort}`
        : undefined;
    },
    get tlsFingerprint() {
      return tlsMaterial?.fingerprint;
    },
    async start() {
      if (status === "ready") return;
      await mkdir(options.dataDir, { recursive: true });
      await backupLoaded;
      await writeFile(`${options.dataDir}/.local-server`, "ready\n", {
        flag: "a",
      });
      if (!database.integrityCheck()) {
        status = "unhealthy";
        writeBlocked = true;
        diagnostic =
          "SQLite integrity check failed. Restore a Verified Backup.";
        throw new Error(diagnostic);
      }
      databaseStatus = "ready";
      writeBlocked = false;
      diagnostic = undefined;
      await new Promise<void>((resolve, reject) => {
        try {
          httpServer = serve(
            {
              fetch: app.fetch,
              hostname: host,
              port,
              websocket: { server: websocketServer },
            },
            (info) => {
              if (info.port !== port)
                return reject(
                  new Error(`Local Server bound unexpected port ${info.port}`),
                );
              status = "ready";
              resolve();
            },
          );
        } catch (error) {
          status = "fatal";
          reject(error);
        }
      });
      if (httpsPort) {
        await startHttps();
        if (!tlsMaterial)
          throw new Error("Local Server failed to start HTTPS listener");
      }
    },
    async stop(timeoutMs = 5_000) {
      clearInterval(notificationTimer);
      if (backupTimer) clearInterval(backupTimer);
      if (!httpServer) {
        if (ownsDatabase) database.close();
        return;
      }
      status = "starting";
      const server = httpServer;
      httpServer = undefined;
      const secure = httpsServer;
      httpsServer = undefined;
      await Promise.race([
        Promise.all([
          new Promise<void>((resolve) => server.close(() => resolve())),
          ...(secure
            ? [new Promise<void>((resolve) => secure.close(() => resolve()))]
            : []),
        ]),
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
      databaseStatus = "unhealthy";
      writeBlocked = true;
      diagnostic = "Local Server stopped";
      if (ownsDatabase) database.close();
    },
  };
}
