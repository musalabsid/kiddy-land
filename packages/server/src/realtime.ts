import type { ConnectionRegistry } from "./connection.ts";
export type WebSocketRegistry = ConnectionRegistry & { broadcast?: (event: unknown) => void; sendDevice?: (deviceId: string, event: unknown) => void };
import type { IdentityStore } from "./identity.ts";

export type WebSocketDecision = { allowed: true; deviceId: string } | { allowed: false; reason: "unauthorized" | "origin-denied" };

export function authorizeWebSocket(
  identity: IdentityStore,
  registry: ConnectionRegistry,
  headers: { authorization?: string; accessToken?: string; origin?: string },
  expectedOrigin: string,
  _socket: { close: (code?: number, reason?: string) => void },
): WebSocketDecision {
  if (headers.origin !== expectedOrigin) return { allowed: false, reason: "origin-denied" };
  const bearerToken = headers.authorization?.replace(/^Bearer /, "");
  const current = identity.authenticate(bearerToken ?? headers.accessToken);
  if (!current) return { allowed: false, reason: "unauthorized" };
  return { allowed: true, deviceId: current.device.id };
}

export function closeRevokedConnections(identity: IdentityStore, registry: ConnectionRegistry, deviceId: string) {
  if (!identity.devices.get(deviceId)?.revokedAt) return false;
  registry.closeDevice(deviceId);
  return true;
}

export function publishReportEvent(registry: WebSocketRegistry, event: { type: string; [key: string]: unknown }) { registry.broadcast?.(event);
}
