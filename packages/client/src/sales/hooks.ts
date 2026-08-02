import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClient } from "../client-context";
import { canMutate, useConnectionStore } from "../connection/store";
import { clientQueryKeys } from "../query/query-client";
import type { SaleInput, SaleRecord, PrintAttempt } from "../api/types";

export function useSale(saleId?: string) { const client = useClient(); return useQuery({ queryKey: [...clientQueryKeys.sale, saleId], queryFn: () => client.get<SaleRecord>(`/sales/${saleId}`), enabled: Boolean(saleId) }); }
export function useCompleteSale() { const client = useClient(); const queryClient = useQueryClient(); const connection = useConnectionStore(); return useMutation({ mutationFn: (input: SaleInput) => { if (!canMutate(connection.state, connection.synchronized)) throw new Error("Connection is not synchronized"); return client.post<SaleRecord>("/sales", input); }, onSuccess: (sale) => { void queryClient.invalidateQueries({ queryKey: clientQueryKeys.sales }); queryClient.setQueryData([...clientQueryKeys.sale, sale.id], sale); } }); }
export function usePrintAttempt() { const client = useClient(); return useMutation({ mutationFn: ({ saleId, ...input }: Omit<PrintAttempt, "id" | "saleId" | "at"> & { saleId: string }) => client.post<PrintAttempt>(`/sales/${saleId}/print-attempts`, input) }); }
export function saleArtifactUrl(origin: string, saleId: string, kind: "tickets" | "receipt") { return `${origin}/sales/${saleId}/artifacts/${kind}`; }
export function useSaleArtifact() {
  const client = useClient();
  return async (saleId: string, kind: "tickets" | "receipt") => {
    const response = await fetch(saleArtifactUrl(client.origin, saleId, kind), { headers: { Authorization: `Bearer ${client.getToken()}` } });
    if (!response.ok) throw new Error("Artifact unavailable");
    return response.blob();
  };
}

