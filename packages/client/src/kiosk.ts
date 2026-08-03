import { useQuery } from "@tanstack/react-query";
import { useClient } from "./client-context";
import { useLogout } from "./query/hooks";
import type { ProductRecord, ScanResult } from "./api/types";

export type PublicTicketResult = Pick<ScanResult, "ok" | "state" | "message"> & { remainingMinutes: number };
export type PublicProduct = Pick<ProductRecord, "id" | "sku" | "name" | "price" | "barcode">;

export function usePublicTicket(code: string) {
  const client = useClient(); const logout = useLogout();
  return useQuery({ queryKey: ["public-ticket", code], queryFn: async () => { try { return await client.post<PublicTicketResult>("/public/tickets/validate", { code }); } catch (error) { if (error instanceof Error && "status" in error && ((error as { status: number }).status === 401 || (error as { status: number }).status === 403)) logout(); throw error; } }, enabled: false, retry: false });
}
export function usePublicProducts(search?: string) {
  const client = useClient(); const logout = useLogout();
  return useQuery({ queryKey: ["public-products", search], queryFn: async () => { try { return await client.get<PublicProduct[]>(`/public/products${search ? `?search=${encodeURIComponent(search)}` : ""}`); } catch (error) { if (error instanceof Error && "status" in error && ((error as { status: number }).status === 401 || (error as { status: number }).status === 403)) logout(); throw error; } }, staleTime: 5_000 });
}
