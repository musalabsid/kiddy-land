import type { ApiClient } from "../api/client";
import type { AuthSessionResponse, LoginResponse, PairResponse, DeviceMode, SessionInfo } from "../api/types";

export class AuthService {
  async bootstrap(password: string) { return this.client.post<import("../api/types").BootstrapResponse>("/auth/bootstrap", { password }); }
  async bootstrapStatus() { return this.client.get<import("../api/types").BootstrapStatus>("/auth/bootstrap-status"); }
  async ownerLogin(password: string) { return this.client.post<import("../api/types").LoginResponse>("/auth/owner-login", { password }); }
  async createInvitation(origin: string, kind: "private" | "public-kiosk" = "private") { return this.client.post<{ token: string; origin: string; kind: "private" | "public-kiosk"; expiresAt: number; qrPayload: string }>("/pairing/invitations", { origin, kind }); }
  async listDevices() { return this.client.get<{ devices: Array<SessionInfo["device"] & { revokedAt?: number }> }>("/pairing/devices"); }
  async revokeDevice(deviceId: string) { return this.client.post<{ ok: boolean }>(`/pairing/devices/${deviceId}/revoke`, {}); }
  constructor(private readonly client: ApiClient) {}
  async pair(token: string, mode: DeviceMode, origin?: string) { return this.client.post<PairResponse>("/pairing/redeem", { token, mode }, origin ? { headers: { Origin: origin } } : undefined); }
  async login(deviceId: string, username: string, password: string) { return this.client.post<LoginResponse>("/auth/login", { deviceId, username, password }); }
  async session() { return this.client.get<AuthSessionResponse>("/auth/session"); }
  toSession(token: string, response: LoginResponse, device: SessionInfo["device"], user?: SessionInfo["user"]): SessionInfo { this.client.setToken(token); return { token, deviceId: response.deviceId, device, user }; }
}
