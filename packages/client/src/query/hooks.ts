import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "../auth/service";
import { useAuthStore } from "../auth/store";
import { useClient } from "../react";
import { clientQueryKeys } from "./query-client";
import type { DeviceMode } from "../api/types";

export function useSessionQuery() {
  const client = useClient();
  const setSession = useAuthStore((state) => state.setSession);
  return useQuery({ queryKey: clientQueryKeys.session, queryFn: () => client.get("/auth/session"), enabled: Boolean(client.getToken()), select: (session) => { setSession(undefined); return session; } });
}

export function usePairingMutation() {
  const client = useClient();
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ token, mode, origin }: { token: string; mode: DeviceMode; origin?: string }) => new AuthService(client).pair(token, mode, origin), onSuccess: () => queryClient.invalidateQueries({ queryKey: clientQueryKeys.session }) });
}

export function useLoginMutation() {
  const client = useClient();
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ deviceId, username, password }: { deviceId: string; username: string; password: string }) => new AuthService(client).login(deviceId, username, password), onSuccess: () => queryClient.invalidateQueries({ queryKey: clientQueryKeys.session }) });
}
