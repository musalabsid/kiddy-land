export type DeviceMode = "Cashier" | "Entrance Scanner" | "Exit Scanner" | "Inventory" | "Public Kiosk" | "Owner Dashboard";
export type Role = "Owner" | "Cashier" | "Staff";
export type SessionInfo = { token: string; deviceId: string; user?: { id: string; username: string; role: Role }; device: { id: string; mode: DeviceMode; kind: "private" | "public-kiosk" } };
export type ConnectionState = "connecting" | "connected" | "synchronized" | "disconnected" | "read-only";
export type ServerEvent = { type: string; [key: string]: unknown };
export type AuthSessionResponse = { device: SessionInfo["device"]; user?: SessionInfo["user"] };
export type LoginResponse = { token: string; deviceId: string; userId?: string; createdAt: number };
export type PairResponse = { device: SessionInfo["device"]; session?: { token: string; deviceId: string; createdAt: number } };
