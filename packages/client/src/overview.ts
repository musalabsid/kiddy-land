import { useQuery } from "@tanstack/react-query";
import { useClient } from "./client-context";
export type OverviewTicket = {
  dailyNumber: string;
  code: string;
  ticketId: string;
  saleId: string;
  packageName: string;
  duration: number | null;
  status: "waiting" | "active" | "completed" | "expired" | string;
  sessionStatus: string | null;
  enteredAt: number | null;
  elapsedMinutes: number;
  remainingMinutes: number | null;
  overtimeMinutes: number;
  totalPlayingTime: number;
  childName?: string;
};
export type OverviewResponse = { operatingDate: string; tickets: OverviewTicket[] };
export function useOverviewTickets() {
  const client = useClient();
  return useQuery<OverviewResponse>({
    queryKey: ["overview","tickets"],
    queryFn: () => client.get<OverviewResponse>("/overview/tickets"),
    refetchInterval: 15000,
    staleTime: 5000,
  });
}
