export type ConnectionState = "connected" | "disconnected" | "reconnecting" | "synchronized";

export type WriteGate = {
  state: ConnectionState;
  canWrite: boolean;
};

export function createConnectionState() {
  let state: ConnectionState = "connected";
  return {
    get: (): WriteGate => ({
      state,
      canWrite: state === "connected" || state === "synchronized",
    }),
    disconnect: () => {
      state = "disconnected";
    },
    reconnect: () => {
      state = "reconnecting";
    },
    synchronized: () => {
      state = "synchronized";
    },
  };
}

export type ConnectionRegistry = ReturnType<typeof createConnectionRegistry>;

export function createConnectionRegistry() {
  const connections = new Map<string, Set<{ close: () => void; send?: (value: string) => void }>>();
  return {
    register(deviceId: string, connection: { close: () => void; send?: (value: string) => void }) {
      const current = connections.get(deviceId) ?? new Set();
      current.add(connection);
      connections.set(deviceId, current);
      return () => current.delete(connection);
    },
    closeDevice(deviceId: string) {
      for (const connection of connections.get(deviceId) ?? []) connection.close();
      connections.delete(deviceId);
    },
    broadcast(event: unknown) {
      for (const deviceConnections of connections.values()) for (const connection of deviceConnections) connection.send?.(JSON.stringify(event));
    },
  };
}
