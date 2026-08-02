import { upgradeWebSocket } from "@hono/node-server";
import { Hono } from "hono";
import type { DeviceMode, IdentityStore } from "./identity.ts";
import type { CalendarStore } from "./calendar.ts";
import type { SaleStore } from "./sale.ts";
import type { LifecycleStore } from "./lifecycle.ts";
import { authorizeWebSocket, type WebSocketRegistry } from "./realtime.ts";

export type HealthStatus = "starting" | "ready" | "unhealthy" | "fatal";

export type HealthReport = {
  status: HealthStatus;
  service: "local-server";
  schemaVersion: number;
  database: "ready" | "unhealthy";
  uptimeMs: number;
};

export function createApp(
  getHealth: () => HealthReport,
  identity?: IdentityStore,
  realtime?: { origin: string; registry: WebSocketRegistry },
  calendar?: CalendarStore,
  sales?: SaleStore,
  lifecycle?: LifecycleStore,
) {
  const app = new Hono();

  app.get("/health", (c) => {
    const health = getHealth();
    return c.json(health, health.status === "ready" ? 200 : 503);
  });
  app.get("/ready", (c) => {
    const health = getHealth();
    return c.json(health, health.status === "ready" ? 200 : 503);
  });

  if (calendar) {
    app.get("/calendar/config", (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "read")) return c.json({ error: "Unauthorized" }, 401);
      return c.json({ timezone: calendar.timezone, weekly: calendar.weekly, overrides: [...calendar.overrides.values()], packages: [...calendar.packages.values()], audit: calendar.audit });
    });
  }

  if (lifecycle) {
    app.post("/tickets/scan/entry", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Entrance Scanner" || !identity?.can(current, "ticket:admit")) return c.json({ error: "Forbidden" }, 403);
      return c.json(lifecycle.admit((await c.req.json<{ code?: string }>()).code ?? ""));
    });
    app.post("/tickets/scan/exit", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Exit Scanner" || !identity?.can(current, "ticket:exit")) return c.json({ error: "Forbidden" }, 403);
      return c.json(lifecycle.exit((await c.req.json<{ code?: string }>()).code ?? ""));
    });
    app.post("/tickets/close", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      const body = await c.req.json<{ date: string; at?: number }>();
      return c.json(lifecycle.close(body.date, body.at ?? Date.now()));
    });
    app.post("/tickets/:id/waive-charge", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.user?.role !== "Owner" || !identity?.can(current, "admin")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json<{ reason: string }>(); return c.json(lifecycle.waiveOutstanding(c.req.param("id"), current.user.role, body.reason)); } catch { return c.json({ error: "Charge cannot be waived" }, 409); }
    });
    app.post("/tickets/recover", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || !identity?.can(current, "ticket:admit")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json<{ code: string; childId: string }>(); return c.json(lifecycle.recover(body.code, body.childId)); } catch { return c.json({ error: "Recovery verification failed" }, 409); }
    });
  }

  if (sales) {
    app.post("/sales", async (c) => {
      const current = identity?.authenticate(c.req.header("Authorization")?.replace(/^Bearer /, ""));
      if (!current || current.device.mode !== "Cashier" || !identity?.can(current, "write")) return c.json({ error: "Forbidden" }, 403);
      try { const body = await c.req.json(); return c.json(sales.complete({ ...body, cashierId: current.user?.id ?? "cashier", at: Date.now() }), 201); } catch { return c.json({ error: "Sale cannot be completed" }, 409); }
    });
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
              const unregister = realtime.registry.register(decision.deviceId, { close: () => ws.close() });
              ws.send(JSON.stringify({ type: "connected", deviceId: decision.deviceId }));
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
    app.post("/pairing/invitations", async (c) => {
      const body = await c.req.json<{ origin?: string; kind?: "private" | "public-kiosk" }>();
      if (!body.origin) return c.json({ error: "origin is required" }, 400);
      return c.json(identity.createEnrollment(body.origin, body.kind ?? "private"), 201);
    });
    app.post("/pairing/redeem", async (c) => {
      const body = await c.req.json<{ token?: string; mode?: DeviceMode }>();
      if (!body.token || !body.mode) return c.json({ error: "token and mode are required" }, 400);
      try { return c.json(identity.pair(body.token, body.mode, c.req.header("Origin")), 201); }
      catch { return c.json({ error: "Enrollment invitation is invalid or expired" }, 409); }
    });
    app.post("/auth/login", async (c) => {
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
      try { calendar.configure(body, current.user.id); return c.json({ ok: true }); }
      catch { return c.json({ error: "Invalid calendar configuration" }, 400); }
    });
  }

  return app;
}
