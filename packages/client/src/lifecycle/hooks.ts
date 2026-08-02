import { useMutation } from "@tanstack/react-query";
import { useClient } from "../client-context";
import { canMutate, useConnectionStore } from "../connection/store";
import type { PlaySession, ScanResult } from "../api/types";

export function useTicketScan(kind: "entry" | "exit") {
  const client = useClient(); const connection = useConnectionStore();
  return useMutation({ mutationFn: (code: string) => { if (!canMutate(connection.state, connection.synchronized)) throw new Error("Connection is not synchronized"); return client.post<ScanResult>(`/tickets/scan/${kind}`, { code }); } });
}
export function useTicketRecovery() {
  const client = useClient(); const connection = useConnectionStore();
  return useMutation({ mutationFn: ({ code, childId }: { code: string; childId: string }) => { if (!canMutate(connection.state, connection.synchronized)) throw new Error("Connection is not synchronized"); return client.post<{ ticketId: string; code: string; qrToken: string }>("/tickets/recover", { code, childId }); } });
}
export function useCollectCharge() {
  const client = useClient(); const connection = useConnectionStore();
  return useMutation({ mutationFn: ({ ticketId, amount, paymentMethod }: { ticketId: string; amount: number; paymentMethod: "cash" | "QRIS" | "bank-transfer" }) => { if (!canMutate(connection.state, connection.synchronized)) throw new Error("Connection is not synchronized"); return client.post<{ ticketId: string; amount: number; paymentMethod: string; collectedAt: number; session: PlaySession }>(`/tickets/${ticketId}/collect-charge`, { amount, paymentMethod }); } });
}
export type { PlaySession, ScanResult };
