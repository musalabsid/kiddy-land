import type { ServerEvent } from "../api/types";

export class RealtimeClient {
  private socket?: WebSocket;
  private manuallyClosed = false;
  private listeners = new Set<(event: ServerEvent) => void>();
  constructor(
    private readonly url: string,
    private readonly token: () => string | undefined,
  ) {}
  connect() {
    this.manuallyClosed = false;
    this.open();
  }
  private open() {
    const token = this.token();
    if (!token) return;
    const separator = this.url.includes("?") ? "&" : "?";
    this.socket = new WebSocket(
      `${this.url}${separator}access_token=${encodeURIComponent(token)}`,
    );
    this.socket.onopen = () => {
      this.emit({ type: "connected" });
      this.refresh();
    };
    this.socket.onmessage = (event) => {
      try {
        this.emit(JSON.parse(event.data) as ServerEvent);
      } catch {
        this.emit({ type: "message-error" });
      }
    };
    this.socket.onclose = (event) => {
      this.emit({
        type: "disconnected",
        code: event.code,
        reason: event.reason,
      });
      if (event.code === 1008) this.emit({ type: "revoked" });
      if (!this.manuallyClosed && typeof window !== "undefined")
        window.setTimeout(() => this.open(), 1000);
    };
  }
  refresh() {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send("refresh");
  }
  close() {
    this.manuallyClosed = true;
    this.socket?.close();
  }
  subscribe(listener: (event: ServerEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(event: ServerEvent) {
    for (const listener of this.listeners) listener(event);
  }
}
