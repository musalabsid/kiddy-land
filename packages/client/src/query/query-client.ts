import { QueryClient } from "@tanstack/react-query";

export function createClientQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5_000, refetchOnReconnect: true, retry: 1 },
      mutations: { retry: 0 },
    },
  });
}

export const clientQueryKeys = {
  host: ["host", "ready"] as const,
  session: ["auth", "session"] as const,
  calendarConfig: ["calendar", "config"] as const,
  calendarSchedule: ["calendar", "schedule"] as const,
};
