import { useQuery } from "@tanstack/react-query";
import { useClient } from "../client-context";
import { clientQueryKeys } from "../query/query-client";
export type ReportFilters = { from?: string; to?: string; cashierId?: string; paymentMethod?: string; packageId?: string; productId?: string; memberId?: string };
function qs(filters: ReportFilters) { const value = new URLSearchParams(); for (const [key, item] of Object.entries(filters)) if (item) value.set(key, item); return value.toString(); }
export function useReport<T>(kind: "financial" | "playground" | "inventory" | "membership", filters: ReportFilters) { const client = useClient(); const query = qs(filters); return useQuery({ queryKey: [...clientQueryKeys.reports, kind, query], queryFn: () => client.get<T>(`/reports/${kind}${query ? `?${query}` : ""}`) }); }
export function useLiveReport<T>() { const client = useClient(); return useQuery({ queryKey: clientQueryKeys.liveReport, queryFn: () => client.get<T>("/reports/live"), refetchInterval: 10_000 }); }
export function reportExportUrl(origin: string, kind: string, filters: ReportFilters, format: "csv" | "pdf") { const query = qs(filters); return `${origin}/reports/${kind}.${format}${query ? `?${query}` : ""}`; }
