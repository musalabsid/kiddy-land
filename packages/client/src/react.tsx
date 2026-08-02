import * as React from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ApiClient } from "./api/client";
import { clientQueryKeys, createClientQueryClient } from "./query/query-client";
import { useAuthStore } from "./auth/store";
import { canMutate, useConnectionStore } from "./connection/store";
import { useRestoreSession } from "./query/hooks";
import { RealtimeClient } from "./connection/realtime";

import { ClientContext } from "./client-context";

export function ClientProvider({ children, origin }: { children: React.ReactNode; origin: string }) {
  const queryClient = React.useMemo(createClientQueryClient, []);
  const client = React.useMemo(() => new ApiClient(origin), [origin]);
  return <QueryClientProvider client={queryClient}><ClientContext.Provider value={client}><SessionRestore><RealtimeSync /><ConnectionSync client={client}>{children}</ConnectionSync></SessionRestore></ClientContext.Provider></QueryClientProvider>;
}

function SessionRestore({ children }: { children: React.ReactNode }) { useRestoreSession(); return <>{children}</>; }

function RealtimeSync() {
  const session = useAuthStore((state) => state.session);
  const clear = useAuthStore((state) => state.clear);
  const setState = useConnectionStore((state) => state.setState);
  const client = useClientContext();
  React.useEffect(() => {
    if (!session) return undefined;
    const realtime = new RealtimeClient(`${client.origin.replace(/^http/, "ws")}/ws`, () => client.getToken());
    const unsubscribe = realtime.subscribe((event) => { if (event.type === "revoked") { client.setToken(undefined); clear(); } else if (event.type === "connected") setState("connected"); else if (event.type === "disconnected") setState("read-only"); else if (event.type === "synchronized") setState("synchronized", true); });
    realtime.connect();
    return () => { unsubscribe(); realtime.close(); };
  }, [client, clear, session, setState]);
  return null;
}

function useClientContext() { const client = React.useContext(ClientContext); if (!client) throw new Error("ClientProvider required"); return client; }

function ConnectionSync({ client, children }: { client: ApiClient; children: React.ReactNode }) {
  const setState = useConnectionStore((state) => state.setState);
  const query = useQuery({ queryKey: clientQueryKeys.host, queryFn: () => client.get<{ status: "ready" | "starting" | "unhealthy" | "fatal" }>("/ready"), refetchInterval: 5_000, retry: 0 });
  React.useEffect(() => { if (query.isSuccess) { setState(query.data.status === "ready" ? "connected" : "read-only"); } else if (query.isError) setState("read-only"); }, [query.isError, query.isSuccess, query.data, setState]);
  return <>{children}</>;
}

export { useClient } from "./client-context";
export function useClientConnection() { const state = useConnectionStore(); return { ...state, canMutate: canMutate(state.state, state.synchronized) }; }
export function useSession() { return useAuthStore(); }
export { ApiClient, ClientError } from "./api/client";
export { AuthService } from "./auth/service";
export { useLoginMutation, usePairingMutation, useSessionQuery } from "./query/hooks";
export { useCalendarConfig, useConfigureCalendar, useSchedule } from "./calendar/hooks";
export { useCompleteSale, usePrintAttempt, useSale, useSaleArtifact, saleArtifactUrl, saleQrUrl } from "./sales/hooks";
export { useTicketScan, useTicketRecovery, useCollectCharge } from "./lifecycle/hooks";
export type * from "./calendar/types";
export { formatDate, formatIdr } from "@kiddy-land/localization";
export type * from "./api/types";
