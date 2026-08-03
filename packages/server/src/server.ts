import { mkdir, writeFile } from "node:fs/promises";
import { serve, type ServerType } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createConnectionRegistry } from "./connection.ts";
import { createCalendarStore, type CalendarStore } from "./calendar.ts";
import { createSaleStore, type SaleStore } from "./sale.ts";
import { createLifecycleStore, type LifecycleStore } from "./lifecycle.ts";
import { createInventoryStore, type InventoryStore } from "./inventory.ts";
import type { HealthReport } from "./app.ts";
import { createApp } from "./app.ts";
import { createIdentityStore, type IdentityStore } from "./identity.ts";
import { openLocalDatabase, type LocalDatabase } from "./database.ts";
import { createReportService, type ReportService } from "./reports.ts";
import { publishReportEvent } from "./realtime.ts";
import { createMembershipStore, type MembershipStore } from "./membership.ts";
import { createNotificationService, type NotificationService } from "./notifications.ts";
import { createBackupService, type BackupService } from "./backup.ts";

export type LocalServerOptions = {
  dataDir: string;
  host?: string;
  port?: number;
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
  database?: LocalDatabase;
  restorePrepared?: (id: string) => Promise<unknown>;
};

export type LocalServer = {
  app: ReturnType<typeof createApp>;
  health: () => HealthReport;
  start: () => Promise<void>;
  stop: (timeoutMs?: number) => Promise<void>;
  url: string;
  restorePrepared: (id: string) => Promise<unknown>;
  replacePrepared: (id: string) => Promise<unknown>;
  setRecoveryBlocked: (blocked: boolean, diagnostic?: string) => void;
};

function now() { return Date.now(); }

export function createLocalServer(options: LocalServerOptions): LocalServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 43117;
  const schemaVersion = options.schemaVersion ?? 5;
  const startedAt = now();
  let status: HealthReport["status"] = "starting";
  let databaseStatus: HealthReport["database"] = "unhealthy";
  let writeBlocked = false;
  let diagnostic: string | undefined;
  let httpServer: ServerType | undefined;
  const health = (): HealthReport => ({ status, service: "local-server", schemaVersion, database: databaseStatus, writeBlocked, diagnostic, uptimeMs: Math.max(0, now() - startedAt) });
  const registry = createConnectionRegistry();
  const identity = options.identity ?? createIdentityStore({ events: { deviceRevoked: (deviceId) => registry.closeDevice(deviceId) } });
  const ownsDatabase = !options.database;
  const database = options.database ?? openLocalDatabase(`${options.dataDir}/kiddy-land.sqlite`);
  const calendar = options.calendar ?? createCalendarStore({ database });
  const inventory = options.inventory ?? createInventoryStore(database);
  const membership = options.membership ?? createMembershipStore(database);
  const sales = options.sales ?? createSaleStore(calendar, database, inventory, membership);
  const lifecycle = options.lifecycle ?? createLifecycleStore(sales, calendar, database);
  const reports = options.reports ?? createReportService(calendar, sales, lifecycle, inventory, membership);
  const notifications = options.notifications ?? createNotificationService(identity, registry, lifecycle, inventory);
  const backups = options.backups ?? createBackupService(database, `${options.dataDir}/backups`, schemaVersion);
  const notificationTimer = setInterval(() => notifications.check(), 30_000);
  const backupLoaded = backups.load();
  const replacePrepared = (id: string) => backups.replacePrepared(id);
  const restorePrepared = options.restorePrepared ?? (async () => { throw new Error("Restore requires the Host Runtime restart coordinator"); });
  const setRecoveryBlocked = (blocked: boolean, reason?: string) => { writeBlocked = blocked; diagnostic = reason; if (blocked) status = "unhealthy"; else if (databaseStatus === "ready") status = "ready"; };
  const app = createApp(health, identity, { origin: `http://${host}:${port}`, registry }, calendar, sales, lifecycle, inventory, membership, reports, notifications, backups, restorePrepared, setRecoveryBlocked);
  publishReportEvent(registry, { type: "report-changed", source: "server-ready" });
  const websocketServer = new WebSocketServer({ noServer: true });

  return {
    app, health, url: `http://${host}:${port}`, restorePrepared, replacePrepared, setRecoveryBlocked,
    async start() {
      if (status === "ready") return;
      await mkdir(options.dataDir, { recursive: true });
      await backupLoaded;
      await writeFile(`${options.dataDir}/.local-server`, "ready\n", { flag: "a" });
      if (!database.integrityCheck()) { status = "unhealthy"; writeBlocked = true; diagnostic = "SQLite integrity check failed. Restore a Verified Backup."; throw new Error(diagnostic); }
      databaseStatus = "ready"; writeBlocked = false; diagnostic = undefined;
      await new Promise<void>((resolve, reject) => {
        try {
          httpServer = serve({ fetch: app.fetch, hostname: host, port, websocket: { server: websocketServer } }, (info) => {
            if (info.port !== port) return reject(new Error(`Local Server bound unexpected port ${info.port}`));
            status = "ready"; resolve();
          });
        } catch (error) { status = "fatal"; reject(error); }
      });
    },
    async stop(timeoutMs = 5_000) {
      clearInterval(notificationTimer);
      if (!httpServer) { if (ownsDatabase) database.close(); return; }
      status = "starting";
      const server = httpServer; httpServer = undefined;
      await Promise.race([new Promise<void>((resolve) => server.close(() => resolve())), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
      databaseStatus = "unhealthy"; writeBlocked = true; diagnostic = "Local Server stopped";
      if (ownsDatabase) database.close();
    },
  };
}
