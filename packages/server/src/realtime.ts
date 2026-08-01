import type { ConnectionRegistry } from "./connection.ts";
export type WebSocketRegistry = ConnectionRegistry;
import type { IdentityStore } from "./identity.ts";

export type WebSocketDecision = { allowed: true; deviceId: string } | { allowed: false; reason: "unauthorized" | "origin-denied" };

export function authorizeWebSocket(
  identity: IdentityStore,
  registry: ConnectionRegistry,
  headers: { authorization?: string; origin?: string },
  expectedOrigin: string,
  _socket: { close: () => void },
): WebSocketDecision {
  if (headers.origin !== expectedOrigin) return { allowed: false, reason: "origin-denied" };
  const current = identity.authenticate(headers.authorization?.replace(/^Bearer /, ""));
  if (!current) return { allowed: false, reason: "unauthorized" };
  return { allowed: true, deviceId: current.device.id };
}

export function closeRevokedConnections(identity: IdentityStore, registry: ConnectionRegistry, deviceId: string) {
  if (!identity.devices.get(deviceId)?.revokedAt) return false;
  registry.closeDevice(deviceId);
  return true;
}
