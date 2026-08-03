import { useQuery } from "@tanstack/react-query";
import { useClient } from "./client-context";
import type { ProductRecord, ScanResult } from "./api/types";

export type PublicTicketResult = Pick<ScanResult, "ok" | "state" | "message"> & { remainingMinutes: number };
export type PublicProduct = Pick<ProductRecord, "id" | "sku" | "name" | "price" | "barcode">;

export function usePublicTicket(code: string) {
  const client = useClient();
  return useQuery({ queryKey: ["public-ticket", code], queryFn: () => client.post<PublicTicketResult>("/public/tickets/validate", { code }), enabled: false, retry: false });
}
export function usePublicProducts(search?: string) {
  const client = useClient();
  return useQuery({ queryKey: ["public-products", search], queryFn: () => client.get<PublicProduct[]>(`/public/products${search ? `?search=${encodeURIComponent(search)}` : ""}`), staleTime: 5_000 });
}
