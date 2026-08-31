import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { LocalDatabase } from "./database.ts";

export const ROLES = ["Owner", "Cashier", "Staff"] as const;
export type Role = (typeof ROLES)[number];
export const DEVICE_MODES = ["Cashier", "Scanner", "Inventory", "Public Kiosk", "Owner Dashboard"] as const;
export type DeviceMode = (typeof DEVICE_MODES)[number];
export type PairingKind = "private" | "public-kiosk";

export type StaffUser = { id: string; username: string; role: Role; passwordHash: string; displayName?: string };
export type PairedDevice = { id: string; mode: DeviceMode; kind: PairingKind; revokedAt?: number; createdAt: number; employeeName?: string };
export type Session = { token: string; deviceId: string; userId?: string; createdAt: number; expiresAt: number };
export type Enrollment = { token: string; origin: string; kind: PairingKind; expiresAt: number; usedAt?: number; staff?: { username: string; role: Role; name: string } };
export type StaffInvite = { name: string; role: Role };
export type IdentityEvents = { deviceRevoked: (deviceId: string) => void };

export type IdentityStore = ReturnType<typeof createIdentityStore>;

const capabilities: Record<Role | "Public", ReadonlySet<string>> = {
  Owner: new Set(["read", "write", "admin", "ticket:admit", "ticket:exit", "inventory:write"]),
  Cashier: new Set(["read", "write", "ticket:admit", "ticket:exit", "inventory:write"]),
  Staff: new Set(["read", "ticket:admit", "ticket:exit", "inventory:write"]),
  Public: new Set(["public:read"]),
};

function id(prefix: string) { return `${prefix}_${randomBytes(12).toString("hex")}`; }

function sameHost(a: string, b: string): boolean {
  try {
    const hostA = new URL(a).hostname.replace(/^\[|\]$/g, "");
    const hostB = new URL(b).hostname.replace(/^\[|\]$/g, "");
    if (hostA === hostB) return true;
    // Loopback and private LAN hosts are the same machine in a local pairing:
    // the desktop creates the invitation from http://127.0.0.1:43117 while the
    // phone scans it from https://192.168.1.108:43118.
    const loopback = (h: string) => h === "localhost" || h === "127.0.0.1" || h === "::1";
    const privateLan = (h: string) => /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(h);
    return (loopback(hostA) || privateLan(hostA)) && (loopback(hostB) || privateLan(hostB));
  } catch { return false; }
}
function token() { return randomBytes(32).toString("base64url"); }
function hashPassword(password: string) { const salt = randomBytes(16); return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`; }
function verifyPassword(password: string, encoded: string) {
  const [saltHex, hashHex] = encoded.split(":");
  if (!saltHex || !hashHex) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createIdentityStore(initial?: { ownerPassword?: string; events?: Partial<IdentityEvents>; database?: LocalDatabase }) {
  const users = new Map<string, StaffUser>();
  const devices = new Map<string, PairedDevice>();
  const database = initial?.database;
  const persistUser = (user: StaffUser) => database?.db.run("INSERT INTO staff_users(id, username, role, password_hash, created_at, display_name) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username=excluded.username, role=excluded.role, password_hash=excluded.password_hash, display_name=excluded.display_name", [user.id, user.username, user.role, user.passwordHash, Date.now(), user.displayName ?? null]);
  const persistDevice = (device: PairedDevice) => database?.db.run("INSERT INTO paired_devices(id, mode, kind, revoked_at, created_at, employee_name) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET mode=excluded.mode, kind=excluded.kind, revoked_at=excluded.revoked_at, employee_name=excluded.employee_name", [device.id, device.mode, device.kind, device.revokedAt ?? null, device.createdAt, device.employeeName ?? null]);
  const enrollments = new Map<string, Enrollment>();
  const sessions = new Map<string, Session>();
  const persistSession = (session: Session) => database?.db.run("INSERT INTO sessions(token, device_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET device_id=excluded.device_id, user_id=excluded.user_id, expires_at=excluded.expires_at", [session.token, session.deviceId, session.userId ?? null, session.createdAt, session.expiresAt]);
  const deleteSession = (token: string) => database?.db.run("DELETE FROM sessions WHERE token = ?", [token]);
  const deleteSessionsByDevice = (deviceId: string) => database?.db.run("DELETE FROM sessions WHERE device_id = ?", [deviceId]);
  try { database?.db.run("ALTER TABLE staff_users ADD COLUMN display_name TEXT"); } catch {}
  const storedUsers = database?.db.query("SELECT id, username, role, password_hash AS passwordHash, display_name AS displayName FROM staff_users").all() as Array<StaffUser> | undefined;
  storedUsers?.forEach((user) => users.set(user.id, user));
  const owner: StaffUser = [...users.values()].find((user) => user.username === "owner") ?? { id: id("user"), username: "owner", role: "Owner", passwordHash: hashPassword(initial?.ownerPassword ?? "change-me") };
  users.set(owner.id, owner);
  if (!storedUsers?.length) persistUser(owner);
  // ponytail: ensure employee_name column exists for old DBs
  try { database?.db.run("ALTER TABLE paired_devices ADD COLUMN employee_name TEXT"); } catch {}
  const storedDevices = database?.db.query("SELECT id, mode, kind, revoked_at AS revokedAt, created_at AS createdAt, employee_name AS employeeName FROM paired_devices").all() as PairedDevice[] | undefined;
  try { database?.db.run("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, device_id TEXT NOT NULL, user_id TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)"); } catch {}
  const storedSessions = database?.db.query("SELECT token, device_id AS deviceId, user_id AS userId, created_at AS createdAt, expires_at AS expiresAt FROM sessions WHERE expires_at > ?").all(Date.now()) as Session[] | undefined;
  storedSessions?.forEach((session) => sessions.set(session.token, session));
  storedDevices?.forEach((device) => {
    const m = device.mode as string;
    if (m === "Entrance Scanner" || m === "Exit Scanner") (device as {mode: string}).mode = "Scanner";
    devices.set(device.id, device);
  });

  function isBootstrapped() { return [...devices.values()].some((device) => !device.revokedAt); }
  function ownerDevice() { return [...devices.values()].find((device) => device.mode === "Owner Dashboard" && !device.revokedAt); }
  function bootstrap(password: string) {
    if (isBootstrapped()) throw new Error("Host is already set up");
    if (password.trim().length < 8) throw new Error("Password must be at least 8 characters");
    owner.passwordHash = hashPassword(password);
    persistUser(owner);
    const device: PairedDevice = { id: id("device"), mode: "Owner Dashboard", kind: "private", createdAt: Date.now() };
    devices.set(device.id, device);
    persistDevice(device);
    return { device, session: createSession(device.id, owner.id) };
  }

  function createEnrollment(origin: string, kind: PairingKind = "private", ttlMs = 60_000, staff?: StaffInvite) {
    const invitation: Enrollment = { token: token(), origin, kind, expiresAt: Date.now() + ttlMs, staff: staff ? { username: `staff-${token().slice(0, 8)}`, role: staff.role, name: staff.name } : undefined };
    enrollments.set(invitation.token, invitation);
    return { ...invitation, qrPayload: JSON.stringify({ origin, token: invitation.token, kind, ...(staff ? { staff: { name: staff.name, role: staff.role } } : {}) }) };
  }
  function normalizeMode(mode: string): DeviceMode { return (mode === "Entrance Scanner" || mode === "Exit Scanner" ? "Scanner" : mode) as DeviceMode; }
  function allowedForMode(mode: string) {
    if (mode === "Cashier") return "Cashier";
    if (mode === "Scanner") return "Staff";
    if (mode === "Inventory") return "Staff";
    if (mode === "Owner Dashboard") return "Owner";
    return "unknown";
  }
  function isCompatible(role: string, mode: string) {
    if (mode === "Owner Dashboard") return true;
    if (role === "Cashier") return mode === "Cashier";
    if (role === "Staff") return mode === "Scanner" || mode === "Inventory";
    if (role === "Owner") return mode === "Owner Dashboard" || mode === "Cashier" || mode === "Scanner" || mode === "Inventory" || mode === "Public Kiosk";
    return false;
  }
  function pair(enrollmentToken: string, mode: DeviceMode, origin?: string) {
    mode = normalizeMode(mode as string);
    const invitation = enrollments.get(enrollmentToken);
    if (!invitation || invitation.usedAt || invitation.expiresAt <= Date.now()) throw new Error("Enrollment invitation is invalid or expired");
    // The QR payload may be scanned from a different origin than the one that
    // created it (e.g. invitation created on http://localhost:3000, scanned on
    // https://192.168.1.108:43118). Allow the pair when both resolve to the
    // same hostname — scheme and port are not security boundaries here since
    // the token itself is a high-entropy one-time secret.
    if (origin !== undefined && !sameHost(origin, invitation.origin)) throw new Error("Enrollment invitation is invalid or expired");
    if (invitation.kind === "public-kiosk" && mode !== "Public Kiosk") {
      throw new Error(`Public kiosk invitation can only be used for Public Kiosk device`);
    }
    if (invitation.staff && !isCompatible(invitation.staff.role, mode)) {
      throw new Error(`Role ${invitation.staff.role} cannot use ${mode} device — ${mode} requires ${allowedForMode(mode)} role`);
    }
    invitation.usedAt = Date.now();
    const device: PairedDevice = { id: id("device"), mode, kind: invitation.kind, createdAt: Date.now(), employeeName: invitation.staff?.name };
    devices.set(device.id, device);
    persistDevice(device);
    // When the invite carries a staff account, create the user now and bind
    // the device session to them — the phone is logged in immediately on scan.
    let userId: string | undefined;
    if (invitation.staff) {
      const user: StaffUser = { id: id("user"), username: invitation.staff.username, role: invitation.staff.role, passwordHash: hashPassword(invitation.token), displayName: invitation.staff.name };
      users.set(user.id, user);
      persistUser(user);
      userId = user.id;
    }
    const session = invitation.kind === "public-kiosk" || invitation.staff ? createSession(device.id, userId) : undefined;
    return { device, session };
  }
  function createSession(deviceId: string, userId?: string) {
    const device = devices.get(deviceId);
    if (!device || device.revokedAt) throw new Error("Device is revoked or unknown");
    const createdAt = Date.now();
    // All devices are owner-managed (staff phones, kiosks inside the venue)
    // and stay signed in for 30 days. A lost device is handled by revoking it.
    const ttlMs = 30 * 24 * 60 * 60_000;
    const session = { token: token(), deviceId, userId, createdAt, expiresAt: createdAt + ttlMs };
    sessions.set(session.token, session);
    persistSession(session);
    return session;
  }
  function login(deviceId: string, username: string, password: string) {
    const user = [...users.values()].find((candidate) => candidate.username === username);
    if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("Invalid credentials");
    const device = devices.get(deviceId);
    if (device && !isCompatible(user.role, device.mode as string)) {
      throw new Error(`Role ${user.role} cannot use ${device.mode} device — ${device.mode} requires ${allowedForMode(device.mode as string)} role`);
    }
    return createSession(deviceId, user.id);
  }
  function changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = users.get(userId);
    if (!user) throw new Error("User not found");
    if (!verifyPassword(currentPassword, user.passwordHash)) throw new Error("Current password is incorrect");
    if (newPassword.trim().length < 8) throw new Error("New password must be at least 8 characters");
    user.passwordHash = hashPassword(newPassword);
    persistUser(user);
    return { ok: true };
  }
  function authenticate(sessionToken: string | undefined) {
    const session = sessionToken ? sessions.get(sessionToken) : undefined;
    const device = session && devices.get(session.deviceId);
    if (!session || !device || device.revokedAt || session.expiresAt <= Date.now()) { if (session?.expiresAt && session.expiresAt <= Date.now()) sessions.delete(session.token); return undefined; }
    const user = session.userId ? users.get(session.userId) : undefined;
    if (device.kind === "private" && !user) return undefined;
    return { session, device, user };
  }
  const modeCapabilities: Record<DeviceMode, ReadonlySet<string>> = {
    Cashier: new Set(["read", "write"]),
    Scanner: new Set(["read", "ticket:admit", "ticket:exit"]),
    Inventory: new Set(["read", "inventory:write"]),
    "Public Kiosk": new Set(["public:read"]),
    "Owner Dashboard": new Set(["read", "write", "admin", "inventory:write"]),
  };
  function can(identity: NonNullable<ReturnType<typeof authenticate>>, capability: string) {
    const role = identity.user?.role ?? "Public";
    return capabilities[role].has(capability) && modeCapabilities[identity.device.mode].has(capability);
  }
  function revokeDevice(deviceId: string) {
    const device = devices.get(deviceId);
    if (!device) return false;
    device.revokedAt = Date.now();
    persistDevice(device);
    for (const [key, session] of sessions) if (session.deviceId === deviceId) { sessions.delete(key); deleteSession(key); }
    deleteSessionsByDevice(deviceId);
    initial?.events?.deviceRevoked?.(deviceId);
    return true;
  }
  function deleteDevice(deviceId: string) {
    const device = devices.get(deviceId);
    if (!device) return false;
    // Hard delete: also revokes (kills sessions) and removes the pairing history.
    for (const [key, session] of sessions) if (session.deviceId === deviceId) { sessions.delete(key); deleteSession(key); }
    deleteSessionsByDevice(deviceId);
    devices.delete(deviceId);
    database?.db.run("DELETE FROM paired_devices WHERE id = ?", [deviceId]);
    initial?.events?.deviceRevoked?.(deviceId);
    return true;
  }
  return { owner, users, devices, sessions, isBootstrapped, ownerDevice, bootstrap, createEnrollment, pair, login, changePassword, authenticate, can, revokeDevice, deleteDevice };
}

export type Identity = NonNullable<ReturnType<IdentityStore["authenticate"]>>;
