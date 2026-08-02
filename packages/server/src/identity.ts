import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ROLES = ["Owner", "Cashier", "Staff"] as const;
export type Role = (typeof ROLES)[number];
export const DEVICE_MODES = ["Cashier", "Entrance Scanner", "Exit Scanner", "Inventory", "Public Kiosk", "Owner Dashboard"] as const;
export type DeviceMode = (typeof DEVICE_MODES)[number];
export type PairingKind = "private" | "public-kiosk";

export type StaffUser = { id: string; username: string; role: Role; passwordHash: string };
export type PairedDevice = { id: string; mode: DeviceMode; kind: PairingKind; revokedAt?: number };
export type Session = { token: string; deviceId: string; userId?: string; createdAt: number };
export type Enrollment = { token: string; origin: string; kind: PairingKind; expiresAt: number; usedAt?: number };
export type IdentityEvents = { deviceRevoked: (deviceId: string) => void };

export type IdentityStore = ReturnType<typeof createIdentityStore>;

const capabilities: Record<Role | "Public", ReadonlySet<string>> = {
  Owner: new Set(["read", "write", "admin", "ticket:admit", "ticket:exit", "inventory:write"]),
  Cashier: new Set(["read", "write", "ticket:admit", "ticket:exit", "inventory:write"]),
  Staff: new Set(["read", "ticket:admit", "ticket:exit", "inventory:write"]),
  Public: new Set(["public:read"]),
};

function id(prefix: string) { return `${prefix}_${randomBytes(12).toString("hex")}`; }
function token() { return randomBytes(32).toString("base64url"); }
function hashPassword(password: string) { const salt = randomBytes(16); return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`; }
function verifyPassword(password: string, encoded: string) {
  const [saltHex, hashHex] = encoded.split(":");
  if (!saltHex || !hashHex) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createIdentityStore(initial?: { ownerPassword?: string; events?: Partial<IdentityEvents> }) {
  const users = new Map<string, StaffUser>();
  const devices = new Map<string, PairedDevice>();
  const enrollments = new Map<string, Enrollment>();
  const sessions = new Map<string, Session>();
  const owner: StaffUser = { id: id("user"), username: "owner", role: "Owner", passwordHash: hashPassword(initial?.ownerPassword ?? "change-me") };
  users.set(owner.id, owner);

  function createEnrollment(origin: string, kind: PairingKind = "private", ttlMs = 60_000) {
    const invitation: Enrollment = { token: token(), origin, kind, expiresAt: Date.now() + ttlMs };
    enrollments.set(invitation.token, invitation);
    return { ...invitation, qrPayload: JSON.stringify({ origin, token: invitation.token, kind }) };
  }
  function pair(enrollmentToken: string, mode: DeviceMode, origin?: string) {
    const invitation = enrollments.get(enrollmentToken);
    if (!invitation || invitation.usedAt || invitation.expiresAt <= Date.now() || (origin !== undefined && invitation.origin !== origin)) throw new Error("Enrollment invitation is invalid or expired");
    invitation.usedAt = Date.now();
    const device: PairedDevice = { id: id("device"), mode, kind: invitation.kind };
    devices.set(device.id, device);
    const session = invitation.kind === "public-kiosk" ? createSession(device.id) : undefined;
    return { device, session };
  }
  function createSession(deviceId: string, userId?: string) {
    const device = devices.get(deviceId);
    if (!device || device.revokedAt) throw new Error("Device is revoked or unknown");
    const session = { token: token(), deviceId, userId, createdAt: Date.now() };
    sessions.set(session.token, session);
    return session;
  }
  function login(deviceId: string, username: string, password: string) {
    const user = [...users.values()].find((candidate) => candidate.username === username);
    if (!user || !verifyPassword(password, user.passwordHash)) throw new Error("Invalid credentials");
    return createSession(deviceId, user.id);
  }
  function authenticate(sessionToken: string | undefined) {
    const session = sessionToken ? sessions.get(sessionToken) : undefined;
    const device = session && devices.get(session.deviceId);
    if (!session || !device || device.revokedAt) return undefined;
    const user = session.userId ? users.get(session.userId) : undefined;
    if (device.kind === "private" && !user) return undefined;
    return { session, device, user };
  }
  const modeCapabilities: Record<DeviceMode, ReadonlySet<string>> = {
    Cashier: new Set(["read", "write"]),
    "Entrance Scanner": new Set(["read", "ticket:admit"]),
    "Exit Scanner": new Set(["read", "ticket:exit"]),
    Inventory: new Set(["read", "inventory:write"]),
    "Public Kiosk": new Set(["public:read"]),
    "Owner Dashboard": new Set(["read", "write", "admin"]),
  };
  function can(identity: NonNullable<ReturnType<typeof authenticate>>, capability: string) {
    const role = identity.user?.role ?? "Public";
    return capabilities[role].has(capability) && modeCapabilities[identity.device.mode].has(capability);
  }
  function revokeDevice(deviceId: string) {
    const device = devices.get(deviceId);
    if (!device) return false;
    device.revokedAt = Date.now();
    for (const [key, session] of sessions) if (session.deviceId === deviceId) sessions.delete(key);
    initial?.events?.deviceRevoked?.(deviceId);
    return true;
  }
  return { owner, users, devices, sessions, createEnrollment, pair, login, authenticate, can, revokeDevice };
}

export type Identity = NonNullable<ReturnType<IdentityStore["authenticate"]>>;
