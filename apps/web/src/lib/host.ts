export type HostState = "starting" | "ready" | "unhealthy" | "fatal";

export type HostStatus = {
  state: HostState;
  message: string;
  origin?: string;
  database?: "ready" | "unhealthy";
  uptimeMs?: number;
};

const defaultOrigin = import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";

export async function fetchHostStatus(origin = defaultOrigin, signal?: AbortSignal): Promise<HostStatus> {
  try {
    const response = await fetch(`${origin}/ready`, { signal });
    const report = (await response.json()) as { status?: HostState; database?: HostStatus["database"]; uptimeMs?: number };
    const state = report.status ?? (response.ok ? "ready" : "unhealthy");
    return { state, message: messageFor(state), origin, database: report.database, uptimeMs: report.uptimeMs };
  } catch {
    return { state: "unhealthy", message: "Local Server is unavailable", origin };
  }
}

function messageFor(state: HostState) {
  switch (state) {
    case "starting": return "Local Server is starting";
    case "ready": return "Local Server ready for local operation";
    case "fatal": return "Local Server failed to start";
    default: return "Local Server is unavailable";
  }
}
