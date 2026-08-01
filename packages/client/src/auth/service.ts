import type { ApiClient } from "../api/client";
import type { AuthSessionResponse, LoginResponse, PairResponse, DeviceMode, SessionInfo } from "../api/types";

export class AuthService {
  constructor(private readonly client: ApiClient) {}
  async pair(token: string, mode: DeviceMode, origin?: string) { return this.client.post<PairResponse>("/pairing/redeem", { token, mode }, origin ? { headers: { Origin: origin } } : undefined); }
  async login(deviceId: string, username: string, password: string) { return this.client.post<LoginResponse>("/auth/login", { deviceId, username, password }); }
  async session() { return this.client.get<AuthSessionResponse>("/auth/session"); }
  toSession(token: string, response: LoginResponse, device: SessionInfo["device"], user?: SessionInfo["user"]): SessionInfo { this.client.setToken(token); return { token, deviceId: response.deviceId, device, user }; }
}
