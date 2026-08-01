export type ConnectionState = "connected" | "disconnected" | "reconnecting" | "synchronized";

export type WriteGate = {
  state: ConnectionState;
  canWrite: boolean;
};

export function createConnectionState() {
  let state: ConnectionState = "connected";
  return {
    get: (): WriteGate => ({ state, canWrite: state === "synchronized" || state === "connected" }),
    disconnect: () => { state = "disconnected"; },
    reconnect: () => { state = "reconnecting"; },
    synchronized: () => { state = "synchronized"; },
  };
}
