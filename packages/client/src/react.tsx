import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";

import { ApiClient } from "./api/client";
import { useAuthStore } from "./auth/store";
import { ClientContext } from "./client-context";
import { RealtimeClient } from "./connection/realtime";
import { canMutate, useConnectionStore } from "./connection/store";
import { useRestoreSession } from "./query/hooks";
import { clientQueryKeys, createClientQueryClient } from "./query/query-client";

export function ClientProvider({
  children,
  origin,
}: {
  children: React.ReactNode;
  origin: string;
}) {
  const queryClient = React.useMemo(createClientQueryClient, []);
  const client = React.useMemo(() => new ApiClient(origin), [origin]);
  return (
    <QueryClientProvider client={queryClient}>
      <ClientContext.Provider value={client}>
        <SessionRestore>
          <RealtimeSync />
          <ConnectionSync client={client}>{children}</ConnectionSync>
        </SessionRestore>
      </ClientContext.Provider>
    </QueryClientProvider>
  );
}

function SessionRestore({ children }: { children: React.ReactNode }) {
  useRestoreSession();
  return <>{children}</>;
}

function RealtimeSync() {
  const session = useAuthStore((state) => state.session);
  const clear = useAuthStore((state) => state.clear);
  const setState = useConnectionStore((state) => state.setState);
  const client = useClientContext();
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (!session) return undefined;
    const realtime = new RealtimeClient(
      `${client.origin.replace(/^http/, "ws")}/ws`,
      () => client.getToken(),
    );
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type === "revoked") {
        client.setToken(undefined);
        clear();
      } else if (event.type === "connected") setState("connected");
      else if (event.type === "disconnected") setState("read-only");
      else if (event.type === "synchronized") {
        setState("synchronized", true);
        void queryClient.invalidateQueries({
          queryKey: clientQueryKeys.reports,
        });
        void queryClient.invalidateQueries({
          queryKey: clientQueryKeys.liveReport,
        });
        void queryClient.invalidateQueries({
          queryKey: clientQueryKeys.overview,
        });
      } else if (event.type === "report-changed") {
        void queryClient.invalidateQueries({
          queryKey: clientQueryKeys.reports,
        });
        void queryClient.invalidateQueries({
          queryKey: clientQueryKeys.liveReport,
        });
        void queryClient.invalidateQueries({
          queryKey: clientQueryKeys.overview,
        });
      } else if (
        event.type === "notification" &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("kiddy-land-notification", { detail: event }),
        );
        // five-minute-remaining alerts also drive voice (kiddy-land-alert) with dailyNumber/threshold
        if (event.kind === "five-minute-remaining" && event.dailyNumber)
          window.dispatchEvent(
            new CustomEvent("kiddy-land-alert", {
              detail: { ...event, type: "alert" },
            }),
          );
      } else if (event.type === "alert" && typeof window !== "undefined")
        window.dispatchEvent(
          new CustomEvent("kiddy-land-alert", { detail: event }),
        );
    });
    realtime.connect();
    return () => {
      unsubscribe();
      realtime.close();
    };
  }, [client, clear, session, setState]);
  return null;
}

function useClientContext() {
  const client = React.useContext(ClientContext);
  if (!client) throw new Error("ClientProvider required");
  return client;
}

function ConnectionSync({
  client,
  children,
}: {
  client: ApiClient;
  children: React.ReactNode;
}) {
  const setState = useConnectionStore((state) => state.setState);
  const query = useQuery({
    queryKey: clientQueryKeys.host,
    queryFn: () =>
      client.get<{ status: "ready" | "starting" | "unhealthy" | "fatal" }>(
        "/ready",
      ),
    refetchInterval: 5_000,
    retry: 0,
  });
  React.useEffect(() => {
    if (query.isSuccess) {
      setState(query.data.status === "ready" ? "connected" : "read-only");
    } else if (query.isError) setState("read-only");
  }, [query.isError, query.isSuccess, query.data, setState]);
  return <>{children}</>;
}

export { useClient } from "./client-context";
export { useAuthStore } from "./auth/store";
export function useClientConnection() {
  const state = useConnectionStore();
  return { ...state, canMutate: canMutate(state.state, state.synchronized) };
}
export function useSession() {
  return useAuthStore();
}
export { ApiClient, ClientError } from "./api/client";
export { AuthService } from "./auth/service";
export {
  useLoginMutation,
  useOwnerLoginMutation,
  usePairingMutation,
  useSessionQuery,
  useDevicesQuery,
  useInvitationMutation,
  useRevokeDeviceMutation,
  useDeleteDeviceMutation,
  useBootstrapStatusQuery,
  useBootstrapMutation,
  useLogout,
  useChangePasswordMutation,
} from "./query/hooks";
export {
  useCalendarConfig,
  useConfigureCalendar,
  useDeleteCalendarOverride,
  useDeleteTicketPackage,
  useSchedule,
  usePackageSnapshot,
} from "./calendar/hooks";
export {
  useCompleteSale,
  usePrintAttempt,
  useSale,
  useSales,
  useSaleArtifact,
  saleArtifactUrl,
  saleQrUrl,
} from "./sales/hooks";
export { useCashierDraftStore } from "./sales/store";
export {
  useTicketScan,
  useTicketRecovery,
  useCollectCharge,
  useRefundDeposit,
} from "./lifecycle/hooks";
export * from "./inventory/hooks";
export * from "./kiosk";
export * from "./members/hooks";
export * from "./reports/hooks";
export { useOverview } from "./overview";
export type {
  OverviewResponse,
  OverviewTicket,
  OverviewHealth,
  OverviewLive,
} from "./overview";
export type * from "./calendar/types";
export * from "./calendar/hooks";
export { formatDate, formatIdr } from "@kiddy-land/localization";
export type * from "./api/types";
