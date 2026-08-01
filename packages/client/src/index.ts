import type { Locale } from "@kiddy-land/localization";

export type DeviceMode = "Cashier" | "Entrance Scanner" | "Exit Scanner" | "Inventory" | "Public Kiosk" | "Owner Dashboard";
export type Role = "Owner" | "Cashier" | "Staff";
export type SessionInfo = { token: string; deviceId: string; user?: { id: string; username: string; role: Role }; device: { id: string; mode: DeviceMode; kind: "private" | "public-kiosk" } };
export type ApiError = { status: number; message: string; details?: unknown };

export class ClientError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) { super(message); this.name = "ClientError"; }
}

export class ApiClient {
  constructor(public readonly origin: string, private token?: string) {}
  setToken(token: string | undefined) { this.token = token; }
  getToken() { return this.token; }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    const response = await fetch(`${this.origin}${path}`, { ...init, headers });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("json") ? await response.json() : await response.text();
    if (!response.ok) { const message = typeof body === "object" && body && "error" in body ? String(body.error) : `Request failed (${response.status})`; throw new ClientError(response.status, message, body); }
    return body as T;
  }
  get<T>(path: string, init?: RequestInit) { return this.request<T>(path, { ...init, method: "GET" }); }
  post<T>(path: string, body: unknown, init?: RequestInit) { return this.request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }); }
}

export type ClientAuth = { client: ApiClient; session?: SessionInfo; locale: Locale };
export const canMutate = (connected: boolean, synchronized: boolean) => connected && synchronized;
export const sessionFromToken = (client: ApiClient, token: string, session: Omit<SessionInfo, "token">) => { client.setToken(token); return { ...session, token }; };

export type ConnectionState = "connecting" | "connected" | "synchronized" | "disconnected" | "read-only";
export type ServerEvent = { type: string; [key: string]: unknown };

export class RealtimeClient {
  private socket?: WebSocket;
  private manuallyClosed = false;
  private listeners = new Set<(event: ServerEvent) => void>();
  constructor(private readonly url: string, private readonly token: () => string | undefined) {}
  connect() { this.manuallyClosed = false; this.open(); }
  private open() { const token = this.token(); if (!token) return; this.socket = new WebSocket(this.url, []); this.socket.onopen = () => this.emit({ type: "connected" }); this.socket.onmessage = (event) => { try { this.emit(JSON.parse(event.data) as ServerEvent); } catch { this.emit({ type: "message-error" }); } }; this.socket.onclose = () => { this.emit({ type: "disconnected" }); if (!this.manuallyClosed) window.setTimeout(() => this.open(), 1000); }; }
  refresh() { this.socket?.send("refresh"); }
  close() { this.manuallyClosed = true; this.socket?.close(); }
  subscribe(listener: (event: ServerEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(event: ServerEvent) { for (const listener of this.listeners) listener(event); }
}

export type { Locale } from "@kiddy-land/localization";
export { formatDate, formatIdr } from "@kiddy-land/localization";
