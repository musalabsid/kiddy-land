import { upgradeWebSocket } from "@hono/node-server";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import type { DeviceMode, IdentityStore, StaffInvite } from "./identity.ts";
import type { CalendarStore } from "./calendar.ts";
import type { SaleStore } from "./sale.ts";
import type { LifecycleStore } from "./lifecycle.ts";
import type { InventoryStore } from "./inventory.ts";
import type { MembershipStore } from "./membership.ts";
import type { ReportService } from "./reports.ts";
import { reportCsv, reportPdf } from "./report-export.ts";
import { publishReportEvent } from "./realtime.ts";
import { authorizeWebSocket, type WebSocketRegistry } from "./realtime.ts";
import type { NotificationService } from "./notifications.ts";
import type { BackupService } from "./backup.ts";

export type HealthStatus = "starting" | "ready" | "unhealthy" | "fatal";

export type HealthReport = {
  status: HealthStatus;
  service: "local-server";
  schemaVersion: number;
  database: "ready" | "unhealthy";
  writeBlocked?: boolean;
  diagnostic?: string;
  uptimeMs: number;
};

export function createApp(
  getHealth: () => HealthReport,
  identity?: IdentityStore,
  realtime?: { origin: string; registry: WebSocketRegistry; httpsUrl?: () => string | undefined; lanIp?: () => string | undefined },
  calendar?: CalendarStore,
  sales?: SaleStore,
  lifecycle?: LifecycleStore,
  inventory?: InventoryStore,
  membership?: MembershipStore,
  reports?: ReportService,
  notifications?: NotificationService,
  backups?: BackupService,
  restorePrepared?: (id: string) => Promise<unknown>,
  setRecoveryBlocked?: (blocked: boolean, diagnostic?: string) => void,
) {
  const app = new Hono();

  // Simple fixed-window rate limiter for auth-sensitive endpoints. In-memory
  // per-IP counters; good enough for a single-host LAN server. Prevents
  // brute-forcing the owner password or invitation tokens from the network.
  // Keyed on the socket remote address (not the spoofable x-forwarded-for).
  const authLimits = new Map<string, { count: number; resetAt: number }>();
  const rateLimit = (c: Context, max: number, windowMs: number): boolean => {
    const incoming = c.env?.incoming as { socket?: { remoteAddress?: string } } | undefined;
    const ip = incoming?.socket?.remoteAddress ?? "local";
    const now = Date.now();
    const entry = authLimits.get(ip);
    if (!entry || entry.resetAt <= now) { authLimits.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
    entry.count += 1;
    if (entry.count > max) return false;
    return true;
  };
  app.use("*", cors({ origin: (origin) => { try { const hostname = new URL(origin).hostname; const trusted = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+)$/.test(hostname) || (process.env.KIDDY_LAND_TRUSTED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean).some((candidate) => { try { return new URL(candidate).hostname === hostname; } catch { return candidate === hostname; } }); return trusted ? origin : undefined; } catch { return undefined; } }, allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"] }));
  app.use("*", async (c, next) => {
    if (c.req.method !== "GET" && getHealth().writeBlocked && !c.req.path.includes("/restore") && !c.req.path.startsWith("/health") && !c.req.path.startsWith("/ready")) return c.json({ error: "Server is in recovery mode", diagnostic: getHealth().diagnostic }, 503);
    await next();
  });

  app.get("/backups", (c) => {
    const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
    if (!current || current.user?.role !== "Owner" || !identity?.can(current, "read")) return c.json({ error: "Forbidden" }, 403);
    return c.json({ backups: backups?.records() ?? [], health: backups?.health() });
  });
  app.post("/backups", async (c) => {
    const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
    if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
    return c.json(await backups?.backup("on-demand"), 201);
  });
  app.post("/backups/:id/restore/stage", async (c) => {
    const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
    if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
    try { setRecoveryBlocked?.(true, "Restore staging. Writes are blocked until restore completes or the server restarts."); const body = await c.req.json<{ confirmation: string }>(); const result = await backups?.prepareRestore(c.req.param("id"), body.confirmation); return c.json(result); } catch (error) { setRecoveryBlocked?.(false); return c.json({ error: error instanceof Error ? error.message : "Restore staging failed" }, 409); }
  });
  app.post("/backups/:id/restore", async (c) => {
    const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
    if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
    try { return c.json(await restorePrepared?.(c.req.param("id"))); } catch (error) { setRecoveryBlocked?.(true, error instanceof Error ? error.message : "Restore failed. Restore the safety backup."); return c.json({ error: error instanceof Error ? error.message : "Restore failed" }, 409); }
  });
  app.get("/health", (c) => {
    const health = getHealth();
    return c.json(health, health.status === "ready" ? 200 : 503);
  });
  app.get("/ready", (c) => {
    const health = getHealth();
    return c.json({ ...health, httpsUrl: realtime?.httpsUrl?.() ?? undefined, lanIp: realtime?.lanIp?.() ?? undefined }, health.status === "ready" ? 200 : 503);
  });

  if (reports) {
    const owner = (c: any) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); return current && current.user?.role === "Owner" && identity?.can(current, "read") ? current : undefined; };
    const query = (c: any) => ({ from: c.req.query("from"), to: c.req.query("to"), cashierId: c.req.query("cashierId"), paymentMethod: c.req.query("paymentMethod"), packageId: c.req.query("packageId"), productId: c.req.query("productId"), memberId: c.req.query("memberId") });
    const report = (kind: string, c: any) => { if (!owner(c)) return c.json({ error: "Forbidden" }, 403); try { return c.json((reports as any)[kind](query(c))); } catch (error) { console.error("report error", error); return c.json({ error: error instanceof Error ? error.message : String(error) }, 400); } };
    app.get("/reports/financial", (c) => report("financial", c)); app.get("/reports/playground", (c) => report("playground", c)); app.get("/reports/inventory", (c) => report("inventory", c)); app.get("/reports/membership", (c) => report("membership", c));
    app.get("/reports/live", (c) => { if (!owner(c)) return c.json({ error: "Forbidden" }, 403); return c.json(reports.live()); });
    const exportReport = (kind: "financial" | "playground" | "inventory" | "membership", format: "csv" | "pdf", c: any) => { if (!owner(c)) return c.json({ error: "Forbidden" }, 403); try { const value = reports[kind](query(c)); const body = format === "csv" ? reportCsv(value) : reportPdf(value); return new Response(body, { headers: { "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/pdf", "Content-Disposition": `attachment; filename="${kind}-report.${format}"` } }); } catch { return c.json({ error: "Report unavailable" }, 400); } };
    for (const kind of ["financial", "playground", "inventory", "membership"] as const) { app.get(`/reports/${kind}.csv`, (c) => exportReport(kind, "csv", c)); app.get(`/reports/${kind}.pdf`, (c) => exportReport(kind, "pdf", c)); }
  }

  if (calendar) {
    app.get("/calendar/config", (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      return c.json({ timezone: calendar.timezone, weekly: calendar.weekly, overrides: [...calendar.overrides.values()], packages: [...calendar.packages.values()], audit: calendar.audit });
    });
  }

  if (lifecycle) {
    app.post("/public/tickets/validate", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Public Kiosk" || !identity?.can(current, "public:read")) return c.json({ error: "Forbidden" }, 403);
      try { return c.json(lifecycle.publicTicket((await c.req.json<{ code?: string }>()).code ?? "")); } catch { return c.json({ error: "Ticket validation unavailable" }, 409); }
    });
    app.post("/tickets/scan/entry", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Entrance Scanner" || !identity?.can(current, "ticket:admit")) return c.json({ error: "Forbidden" }, 403);
      const result = lifecycle.admit((await c.req.json<{ code?: string }>()).code ?? ""); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "session" }); return c.json(result);
    });
    app.post("/tickets/scan/exit", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Exit Scanner" || !identity?.can(current, "ticket:exit")) return c.json({ error: "Forbidden" }, 403);
      const result = lifecycle.exit((await c.req.json<{ code?: string }>()).code ?? ""); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "session" }); return c.json(result);
    });
    app.post("/tickets/close", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      const body = await c.req.json<{ date: string; at?: number }>();
      const result = lifecycle.close(body.date, body.at ?? Date.now()); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "session" }); return c.json(result);
    });
    app.post("/tickets/:id/collect-charge", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Cashier" || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json<{ amount: number; paymentMethod: "cash" | "QRIS" | "bank-transfer" }>(); const result = lifecycle.collectOutstanding(c.req.param("id"), body.amount, body.paymentMethod, current.user?.id ?? "cashier"); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "overtime" }); return c.json(result); } catch { return c.json({ error: "Charge cannot be collected" }, 409); }
    });
    app.post("/tickets/:id/waive-charge", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json<{ reason: string }>(); const result = lifecycle.waiveOutstanding(c.req.param("id"), current.user.role, body.reason); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "overtime" }); return c.json(result); } catch { return c.json({ error: "Charge cannot be waived" }, 409); }
    });
    app.post("/tickets/:id/refund-deposit", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !["Cashier", "Owner"].includes(current.device.mode) || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403);
      try { const result = lifecycle.refundDeposit(c.req.param("id"), current.user?.role ?? "Cashier"); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "deposit" }); return c.json(result); } catch { return c.json({ error: "Deposit cannot be refunded" }, 409); }
    });
    app.post("/tickets/recover", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "ticket:admit")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json<{ code: string; childId: string }>(); const result = lifecycle.recover(body.code, body.childId); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "session" }); return c.json(result); } catch { return c.json({ error: "Recovery verification failed" }, 409); }
    });
  }

  if (inventory) {
    app.get("/public/products", (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Public Kiosk" || !identity?.can(current, "public:read")) return c.json({ error: "Forbidden" }, 403);
      return c.json(inventory.list(c.req.query("search"), false).map(({ id, sku, name, price, barcode }) => ({ id, sku, name, price, barcode })));
    });
    app.get("/products", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); return c.json(inventory.list(c.req.query("search"), current.user?.role === "Owner")); });
    app.get("/products/:id", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); const item = inventory.products.get(c.req.param("id")); return item ? c.json(item) : c.json({ error: "Product not found" }, 404); });
    app.post("/products", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const result = inventory.create(await c.req.json(), current.user.id); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result, 201); } catch { return c.json({ error: "Product cannot be created" }, 409); } });
    app.patch("/products/:id", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const result = inventory.update(c.req.param("id"), await c.req.json()); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result); } catch { return c.json({ error: "Product cannot be updated" }, 409); } });
    app.post("/products/:id/archive", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const result = inventory.archive(c.req.param("id")); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result); } catch { return c.json({ error: "Product cannot be archived" }, 409); } });
    app.post("/products/:id/reactivate", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const result = inventory.reactivate(c.req.param("id")); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result); } catch { return c.json({ error: "Product cannot be reactivated" }, 409); } });
    app.post("/inventory/intake", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "inventory:write")) return c.json({ error: "Forbidden" }, 403); try { const body = await c.req.json<{ productId: string; quantity: number; reason: string }>(); const result = inventory.intake(body.productId, body.quantity, current.user?.id ?? "inventory", body.reason); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result); } catch { return c.json({ error: "Stock intake cannot be recorded" }, 409); } });
    app.post("/inventory/counts", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "inventory:write")) return c.json({ error: "Forbidden" }, 403); try { const body = await c.req.json<{ productId: string; counted: number }>(); const result = inventory.submitCount(body.productId, body.counted, current.user?.id ?? "inventory"); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result, 201); } catch { return c.json({ error: "Stock count cannot be submitted" }, 409); } });
    app.post("/inventory/counts/:id/approve", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const result = inventory.approveCount(c.req.param("id"), current.user.id); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "inventory" }); return c.json(result); } catch { return c.json({ error: "Stock count cannot be approved" }, 409); } });
    app.get("/inventory/movements", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); return c.json(inventory.movements); });
    app.get("/inventory/low-stock", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); return c.json(inventory.list(undefined, false).filter((item) => item.stock <= item.lowStockThreshold)); });
    app.get("/inventory/exceptions", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); return c.json(inventory.exceptions); });
    app.get("/inventory/counts", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); return c.json(inventory.counts); });
  }

  if (membership) {
    app.get("/members/search", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); const name = c.req.query("name"); const phone = c.req.query("phone"); if (!name || !phone) return c.json({ error: "Verified name and phone are required" }, 400); return c.json(membership.search(name, phone)); });
    app.get("/members", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "read")) return c.json({ error: "Forbidden" }, 403); return c.json(membership.list()); });
    app.get("/members/:code", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); const found = membership.findByCode(c.req.param("code")); return found ? c.json(found) : c.json({ error: "Member not found" }, 404); });
    app.post("/members", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.device.mode !== "Cashier" || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403); try { const result = membership.register(await c.req.json(), current.user?.id ?? "cashier"); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "membership" }); return c.json(result, 201); } catch { return c.json({ error: "Member cannot be registered" }, 409); } });
    app.post("/members/:id/reissue", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !((current.device.mode === "Cashier" && identity?.can(current, "write")) || (current.user?.role === "Owner" && identity?.can(current, "admin")))) return c.json({ error: "Forbidden" }, 403); try { const body = await c.req.json<{ reason: string }>(); const result = membership.reissue(c.req.param("id"), body.reason, current.user?.id ?? "owner"); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "membership" }); return c.json(result); } catch { return c.json({ error: "Member code cannot be reissued" }, 409); } });
    for (const [action, status] of [["deactivate", "deactivated"], ["reactivate", "active"]] as const) app.post(`/members/:id/${action}`, async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const body = await c.req.json<{ reason: string }>(); const result = membership.setStatus(c.req.param("id"), status, body.reason, current.user.id); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "membership" }); return c.json(result); } catch { return c.json({ error: "Member status cannot be changed" }, 409); } });
    app.get("/members/:id/history", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "read")) return c.json({ error: "Forbidden" }, 403); return c.json(membership.history(c.req.param("id"))); });
    app.get("/membership/events", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "read")) return c.json({ error: "Forbidden" }, 403); return c.json(membership.state.events); });
    app.put("/membership/discounts/:kind/:id", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const kind = c.req.param("kind") === "products" ? "products" : c.req.param("kind") === "ticketPackages" ? "ticketPackages" : null; if (!kind) return c.json({ error: "Invalid discount scope" }, 400); const body = await c.req.json<{ amount: number }>(); const result = membership.setDiscount(kind, c.req.param("id"), body.amount); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "membership-discount" }); return c.json(result); } catch { return c.json({ error: "Discount cannot be configured" }, 400); } });
    app.get("/membership/discounts", (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401); return c.json(membership.state.discounts); });
  }

  if (sales) {
    app.post("/sales", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Cashier" || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json(); const lines = Array.isArray(body.lines) ? body.lines : []; if (lines.some((line: { outOfStockException?: unknown }) => line.outOfStockException) && current.user?.role !== "Owner") return c.json({ error: "Owner authorization required for out-of-stock exception" }, 403); const at = Date.now(); const result = sales.complete({ ...body, operatingDate: calendar?.operatingDate(new Date(at)) ?? body.operatingDate, cashierId: current.user?.id ?? "cashier", at }); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "sale" }); return c.json(result, 201); } catch { return c.json({ error: "Sale cannot be completed" }, 409); }
    });
    app.post("/sales/:id/void", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const body = await c.req.json<{ reason: string }>(); const result = sales.voidSale(c.req.param("id"), current.user.id, body.reason); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "correction" }); return c.json(result, 201); } catch { return c.json({ error: "Sale cannot be voided" }, 409); } });
    app.post("/sales/:id/corrections", async (c) => { const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "")); if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403); try { const body = await c.req.json<{ lineId?: string; kind: "price-override" | "refund"; correctedAmount: number; reason: string }>(); const result = sales.addCorrection({ ...body, saleId: c.req.param("id"), actorId: current.user.id }); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "correction" }); return c.json(result, 201); } catch { return c.json({ error: "Correction cannot be recorded" }, 409); } });
    app.get("/sales/:id", (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      const sale = sales.get(c.req.param("id")); return sale ? c.json(sale) : c.json({ error: "Sale not found" }, 404);
    });
    app.get("/sales/:id/artifacts/:kind", (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      try { const artifact = sales.artifact(c.req.param("id"), c.req.param("kind") as "tickets" | "receipt"); return new Response(artifact.body, { headers: { "Content-Type": artifact.contentType, "Content-Disposition": `inline; filename="${artifact.filename}"` } }); } catch { return c.json({ error: "Artifact unavailable" }, 404); }
    });
    app.get("/sales/:id/tickets/:ticketId/qr", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      try { const artifact = await sales.qr(c.req.param("id"), c.req.param("ticketId")); return new Response(artifact.body, { headers: { "Content-Type": artifact.contentType, "Content-Disposition": `inline; filename="${artifact.filename}"` } }); } catch { return c.json({ error: "QR unavailable" }, 404); }
    });
    app.post("/sales/:id/refunds", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403);
      try {
        const sale = sales.get(c.req.param("id")); if (!sale || sale.status !== "completed") return c.json({ error: "Sale unavailable" }, 409);
        const body = await c.req.json<{ idempotencyKey: string; lineId: string; quantity: number; disposition: "return-to-stock" | "damaged-consumed"; reason: string }>();
        const line = sale.lines.find((candidate) => candidate.kind === "product" && candidate.lineId === body.lineId); if (!line || line.kind !== "product") return c.json({ error: "Product line not found" }, 404);
        const refunded = inventory?.refunds.filter((item) => item.saleId === sale.id && item.lineId === body.lineId).reduce((sum, item) => sum + item.quantity, 0) ?? 0;
        if (refunded + body.quantity > line.quantity) return c.json({ error: "Refund exceeds sold quantity" }, 409);
        const result = inventory!.refund({ ...body, saleId: sale.id, productId: line.productId, actorId: current.user?.id ?? "cashier" }); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "refund" }); return c.json(result, 201);
      } catch { return c.json({ error: "Refund cannot be recorded" }, 409); }
    });
    app.post("/sales/:id/print-attempts", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json(); return c.json(sales.recordPrintAttempt({ ...body, saleId: c.req.param("id"), actorId: current.user?.id ?? "cashier" }), 201); } catch { return c.json({ error: "Print attempt cannot be recorded" }, 409); }
    });
  }

  if (calendar) {
    app.get("/calendar/schedule", (c) => {
      const date = c.req.query("date");
      if (!date) return c.json({ error: "date is required" }, 400);
      try { return c.json(calendar!.effectiveSchedule(date)); } catch { return c.json({ error: "Invalid date" }, 400); }
    });
    app.get("/calendar/packages/:id/snapshot", (c) => {
      const date = c.req.query("date");
      if (!date) return c.json({ error: "date is required" }, 400);
      try { return c.json(calendar.snapshot(c.req.param("id"), date)); } catch { return c.json({ error: "Package unavailable or venue closed" }, 409); }
    });
  }

  if (identity) {
    if (realtime) {
      app.get(
        "/ws",
        upgradeWebSocket((c) => {
          const decision = authorizeWebSocket(
            identity,
            realtime.registry,
            {
              authorization: c.req.header("Authorization"),
              accessToken: c.req.query("access_token"),
              origin: c.req.header("Origin"),
            },
            realtime.origin,
            { close: () => undefined },
          );
          if (!decision.allowed) return { onOpen: (_event, ws) => ws.close(1008, decision.reason) };
          return {
            onOpen: (_event, ws) => {
              if (!identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, "") ?? c.req.query("access_token"))) {
                ws.close(1008, "revoked");
                return;
              }
              const unregister = realtime.registry.register(decision.deviceId, { close: (code, reason) => ws.close(code, reason), send: (value) => ws.send(value) });
              ws.send(JSON.stringify({ type: "connected", deviceId: decision.deviceId }));
              notifications?.deviceConnected(decision.deviceId);
              (ws as unknown as { __unregister?: () => void }).__unregister = unregister;
            },
            onClose: (_event, ws) => (ws as unknown as { __unregister?: () => void }).__unregister?.(),
            onMessage: (event, ws) => {
              if (event.data === "refresh") ws.send(JSON.stringify({ type: "synchronized", at: Date.now() }));
              else if (event.data === "ping") ws.send("pong");
              else ws.send(JSON.stringify({ type: "error", code: "unknown-command" }));
            },
          };
        }),
      );
    }
    app.get("/notifications/settings", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      return c.json(notifications?.settings.get(current.device.id) ?? { soundEnabled: true });
    });
    app.patch("/notifications/settings", async (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      return c.json(notifications?.configure(current.device.id, await c.req.json<{ soundEnabled?: boolean }>()));
    });
    app.post("/notifications/check", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      notifications?.check(); return c.json({ ok: true });
    });
    app.get("/notifications/routes", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      return c.json(notifications?.routes ?? {});
    });
    app.patch("/notifications/routes/:kind", async (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      try {
        const body = await c.req.json<{ modes: DeviceMode[] }>();
        if (!Array.isArray(body.modes)) return c.json({ error: "modes must be an array" }, 400);
        return c.json(notifications?.configureRoutes(c.req.param("kind") as Parameters<NonNullable<NotificationService>["configureRoutes"]>[0], body.modes));
      } catch { return c.json({ error: "Route configuration is invalid" }, 400); }
    });
    app.get("/pairing/devices", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      return c.json({ devices: [...identity.devices.values()] });
    });
    app.post("/pairing/devices/:id/revoke", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      return identity.revokeDevice(c.req.param("id")) ? c.json({ ok: true }) : c.json({ error: "Device not found" }, 404);
    });
    app.delete("/pairing/devices/:id", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      return identity.deleteDevice(c.req.param("id")) ? c.json({ ok: true }) : c.json({ error: "Device not found" }, 404);
    });
    app.get("/auth/bootstrap-status", (c) => c.json({ required: !identity.isBootstrapped(), ownerDevice: identity.ownerDevice() }));
    app.post("/auth/bootstrap", async (c) => {
      if (!rateLimit(c, 5, 60_000)) return c.json({ error: "Too many attempts; try again later" }, 429);
      try {
        const body = await c.req.json<{ password?: string }>();
        if (!body.password) return c.json({ error: "password is required" }, 400);
        return c.json(identity.bootstrap(body.password), 201);
      } catch (error) { return c.json({ error: error instanceof Error ? error.message : "Bootstrap failed" }, 409); }
    });
    app.post("/pairing/invitations", async (c) => {
      if (!rateLimit(c, 10, 60_000)) return c.json({ error: "Too many invitations; try again later" }, 429);
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      const body = await c.req.json<{ origin?: string; kind?: "private" | "public-kiosk"; staff?: { name?: string; role?: string } }>();
      if (!body.origin) return c.json({ error: "origin is required" }, 400);
      let staff: StaffInvite | undefined;
      if (body.staff) {
        const name = body.staff.name?.trim();
        const role = body.staff.role;
        if (!name) return c.json({ error: "staff name is required" }, 400);
        if (role !== "Cashier" && role !== "Staff") return c.json({ error: "staff role must be Cashier or Staff" }, 400);
        staff = { name, role };
      }
      return c.json(identity.createEnrollment(body.origin, body.kind ?? "private", 60_000, staff), 201);
    });
    app.post("/pairing/redeem", async (c) => {
      if (!rateLimit(c, 10, 60_000)) return c.json({ error: "Too many attempts; try again later" }, 429);
      const body = await c.req.json<{ token?: string; mode?: DeviceMode }>();
      if (!body.token || !body.mode) return c.json({ error: "token and mode are required" }, 400);
      try { return c.json(identity.pair(body.token, body.mode, c.req.header("Origin")), 201); }
      catch { return c.json({ error: "Enrollment invitation is invalid or expired" }, 409); }
    });
    app.post("/auth/owner-login", async (c) => {
      if (!rateLimit(c, 5, 60_000)) return c.json({ error: "Too many attempts; try again later" }, 429);
      const device = identity.ownerDevice();
      if (!device) return c.json({ error: "Host is not set up" }, 409);
      try { return c.json(identity.login(device.id, "owner", (await c.req.json<{ password?: string }>()).password ?? "")); }
      catch { return c.json({ error: "Invalid credentials" }, 401); }
    });
    app.post("/auth/login", async (c) => {
      if (!rateLimit(c, 10, 60_000)) return c.json({ error: "Too many attempts; try again later" }, 429);
      const body = await c.req.json<{ deviceId?: string; username?: string; password?: string }>();
      if (!body.deviceId || !body.username || !body.password) return c.json({ error: "deviceId, username and password are required" }, 400);
      try { return c.json(identity.login(body.deviceId, body.username, body.password)); }
      catch { return c.json({ error: "Invalid credentials" }, 401); }
    });
    app.get("/auth/session", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      return current ? c.json({ device: current.device, user: current.user ? { id: current.user.id, username: current.user.username, role: current.user.role } : undefined }) : c.json({ error: "Unauthorized" }, 401);
    });
    app.get("/auth/capability/:capability", (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current) return c.json({ error: "Unauthorized" }, 401);
      return c.json({ allowed: identity.can(current, c.req.param("capability")) });
    });
    app.post("/calendar/configure", async (c) => {
      const current = identity.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!calendar) return c.json({ error: "Calendar unavailable" }, 503);
      if (!current || current.user?.role !== "Owner" || !identity.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      const body = await c.req.json<{ timezone?: string; day?: import("./calendar.ts").Weekday; hours?: import("./calendar.ts").DailyHours; override?: import("./calendar.ts").ScheduleOverride; package?: Parameters<CalendarStore["upsertPackage"]>[0] }>();
      try { calendar.configure(body, current.user.id); if (realtime) publishReportEvent(realtime.registry, { type: "report-changed", source: "calendar" }); return c.json({ ok: true }); }
      catch { return c.json({ error: "Invalid calendar configuration" }, 400); }
    });
  }

  return app;
}
