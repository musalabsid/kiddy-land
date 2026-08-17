import type { Hono } from "hono";

type JsonResult = { status: number; body: any };

async function appJson(app: Hono, path: string, init: RequestInit = {}): Promise<JsonResult> {
  const response = await app.fetch(new Request(`http://local${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } }));
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

/**
 * In-memory app test setup: bootstrap the owner (creates the owner device and
 * an Owner session), then return an Authorization header for that session.
 * The owner can then create invitations and exercise admin routes.
 */
export async function appBootstrapOwner(app: Hono, password = "change-me"): Promise<{ token: string; deviceId: string }> {
  const boot = await appJson(app, "/auth/bootstrap", { method: "POST", body: JSON.stringify({ password }) });
  if (boot.status !== 201) throw new Error(`bootstrap failed: ${boot.status} ${JSON.stringify(boot.body)}`);
  return { token: boot.body.session.token, deviceId: boot.body.session.deviceId };
}

/** Pair a fresh device with the given Owner session and return its token. */
export async function appPairDevice(app: Hono, ownerToken: string, mode: string, kind = "private"): Promise<{ token: string; deviceId: string }> {
  const invite = await appJson(app, "/pairing/invitations", { method: "POST", headers: { authorization: `Bearer ${ownerToken}` }, body: JSON.stringify({ origin: "http://local", kind, ...(kind === "private" ? { staff: { name: "Test Staff", role: "Cashier" } } : {}) }) });
  if (invite.status !== 201) throw new Error(`invite failed: ${invite.status} ${JSON.stringify(invite.body)}`);
  const paired = await appJson(app, "/pairing/redeem", { method: "POST", headers: { origin: "http://local" }, body: JSON.stringify({ token: invite.body.token, mode }) });
  if (paired.status !== 201) throw new Error(`redeem failed: ${paired.status} ${JSON.stringify(paired.body)}`);
  if (paired.body.session?.token) return { token: paired.body.session.token, deviceId: paired.body.device.id };
  const login = await appJson(app, "/auth/login", { method: "POST", body: JSON.stringify({ deviceId: paired.body.device.id, username: "owner", password: "change-me" }) });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  return { token: login.body.token, deviceId: paired.body.device.id };
}

/** Real-HTTP-server helper: bootstrap owner and return its Authorization token. */
export async function httpBootstrapOwner(base: string, password = "change-me"): Promise<{ token: string; deviceId: string }> {
  const boot = await (await fetch(`${base}/auth/bootstrap`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) })).json() as { session: { token: string; deviceId: string } };
  return { token: boot.session.token, deviceId: boot.session.deviceId };
}
