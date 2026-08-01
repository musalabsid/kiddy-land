import { Hono } from "hono";
import type { DeviceMode, IdentityStore } from "./identity.ts";

export type HealthStatus = "starting" | "ready" | "unhealthy" | "fatal";

export type HealthReport = {
  status: HealthStatus;
  service: "local-server";
  schemaVersion: number;
  database: "ready" | "unhealthy";
  uptimeMs: number;
};

export function createApp(getHealth: () => HealthReport, identity?: IdentityStore) {
  const app = new Hono();

  app.get("/health", (c) => {
    const health = getHealth();
    return c.json(health, health.status === "ready" ? 200 : 503);
  });
  app.get("/ready", (c) => {
    const health = getHealth();
    return c.json(health, health.status === "ready" ? 200 : 503);
  });

  if (identity) {
    app.post("/pairing/invitations", async (c) => {
      const body = await c.req.json<{ origin?: string; kind?: "private" | "public-kiosk" }>();
      if (!body.origin) return c.json({ error: "origin is required" }, 400);
      return c.json(identity.createEnrollment(body.origin, body.kind ?? "private"), 201);
    });
    app.post("/pairing/redeem", async (c) => {
      const body = await c.req.json<{ token?: string; mode?: DeviceMode }>();
      if (!body.token || !body.mode) return c.json({ error: "token and mode are required" }, 400);
      try { return c.json(identity.pair(body.token, body.mode), 201); }
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
  }

  return app;
}
