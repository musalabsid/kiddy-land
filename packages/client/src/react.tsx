import * as React from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ApiClient } from "./api/client";
import { clientQueryKeys, createClientQueryClient } from "./query/query-client";
import { useAuthStore } from "./auth/store";
import { canMutate, useConnectionStore } from "./connection/store";

const ClientContext = React.createContext<ApiClient | undefined>(undefined);

export function ClientProvider({ children, origin }: { children: React.ReactNode; origin: string }) {
  const queryClient = React.useMemo(createClientQueryClient, []);
  const client = React.useMemo(() => new ApiClient(origin), [origin]);
  return <QueryClientProvider client={queryClient}><ClientContext.Provider value={client}><ConnectionSync client={client}>{children}</ConnectionSync></ClientContext.Provider></QueryClientProvider>;
}

function ConnectionSync({ client, children }: { client: ApiClient; children: React.ReactNode }) {
  const setState = useConnectionStore((state) => state.setState);
  const markSynchronized = useConnectionStore((state) => state.markSynchronized);
  const query = useQuery({ queryKey: clientQueryKeys.host, queryFn: () => client.get<{ status: "ready" | "starting" | "unhealthy" | "fatal" }>("/ready"), refetchInterval: 5_000, retry: 0 });
  React.useEffect(() => { if (query.isSuccess) { setState(query.data.status === "ready" ? "connected" : "read-only"); if (query.data.status === "ready") markSynchronized(); } else if (query.isError) setState("read-only"); }, [query.isError, query.isSuccess, query.data, setState, markSynchronized]);
  return <>{children}</>;
}

export function useClient() { const client = React.useContext(ClientContext); if (!client) throw new Error("useClient must be used inside ClientProvider"); return client; }
export function useClientConnection() { const state = useConnectionStore(); return { ...state, canMutate: canMutate(state.state, state.synchronized) }; }
export function useSession() { return useAuthStore(); }
export { ApiClient, ClientError } from "./api/client";
export { AuthService } from "./auth/service";
export { useLoginMutation, usePairingMutation, useSessionQuery } from "./query/hooks";
export { formatDate, formatIdr } from "@kiddy-land/localization";
export type * from "./api/types";
