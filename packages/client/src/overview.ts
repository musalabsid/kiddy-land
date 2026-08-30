import { useQuery } from "@tanstack/react-query";
import { useClient } from "./client-context";
import { clientQueryKeys } from "./query/query-client";

export type OverviewHealth = {
  status: "starting" | "ready" | "unhealthy" | "fatal";
  service: "local-server";
  schemaVersion: number;
  database: "ready" | "unhealthy";
  writeBlocked?: boolean;
  diagnostic?: string;
  uptimeMs: number;
  httpsUrl?: string;
  lanIp?: string;
};

export type OverviewLive = {
  kind: "live";
  timezone: string;
  generatedAt: string;
  data: {
    occupancy: number;
    activeMembers: number;
    lowStock: number;
    products: number;
    sales: number;
  };
};

export type OverviewTicketStatus = "waiting" | "active" | "completed" | "auto-closed" | "void" | "expired";

export type OverviewTicket = {
  ticketId: string;
  code: string;
  dailyNumber: string;
  childId: string;
  childName?: string;
  saleId: string;
  operatingDate: string;
  createdAt: number;
  packageId: string;
  packageName: string;
  includedMinutes: number | null;
  status: OverviewTicketStatus;
  enteredAt?: number;
  exitedAt?: number;
  playingMinutes: number;
  remainingMinutes: number | null;
  overtimeMinutes: number;
  outstandingCharge: number;
  depositStatus: string;
};

export type OverviewResponse = {
  health: OverviewHealth;
  live: OverviewLive;
  tickets: OverviewTicket[];
  generatedAt: string;
  timezone: string;
};

export function useOverview(opts?: { enabled?: boolean; refetchInterval?: number }) {
  const client = useClient();
  return useQuery({
    queryKey: clientQueryKeys.overview,
    queryFn: () => client.get<OverviewResponse>("/overview"),
    enabled: opts?.enabled ?? true,
    refetchInterval: opts?.refetchInterval ?? 5_000,
    retry: 1,
  });
}
