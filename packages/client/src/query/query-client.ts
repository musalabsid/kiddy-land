import { QueryClient } from "@tanstack/react-query";

export function createClientQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, refetchOnReconnect: true, retry: 1 },
      mutations: { retry: 0 },
    },
  });
}

export const clientQueryKeys = {
  host: ["host", "ready"] as const,
  session: ["auth", "session"] as const,
  calendarConfig: ["calendar", "config"] as const,
  calendarSchedule: ["calendar", "schedule"] as const,
  sales: ["sales"] as const,
  sale: ["sales", "detail"] as const,
  products: ["products"] as const,
  inventoryMovements: ["inventory", "movements"] as const,
  lowStock: ["inventory", "low-stock"] as const,
  inventoryCounts: ["inventory", "counts"] as const,
  inventoryExceptions: ["inventory", "exceptions"] as const,
  members: ["members"] as const,
  memberHistory: (id: string) => ["members", id, "history"] as const,
  membershipDiscounts: ["membership", "discounts"] as const,
  reports: ["reports"] as const,
  liveReport: ["reports", "live"] as const,
  overview: ["overview"] as const,
};
