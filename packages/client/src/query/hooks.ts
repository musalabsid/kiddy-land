import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "../auth/service";
import { readStoredDevice, readStoredSession, useAuthStore, writeStoredDevice, writeStoredSession } from "../auth/store";
import { ClientContext } from "../client-context";
import { clientQueryKeys } from "./query-client";
import type { DeviceMode, SessionInfo } from "../api/types";

function useApiClient() { const client = React.useContext(ClientContext); if (!client) throw new Error("ClientProvider required"); return client; }

export function useSessionQuery() {
  const client = useApiClient();
  return useQuery({ queryKey: clientQueryKeys.session, queryFn: () => client.get("/auth/session"), enabled: Boolean(client.getToken()) });
}

export function useOwnerLoginMutation() {
  const client = useApiClient();
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({ mutationFn: (password: string) => new AuthService(client).ownerLogin(password), onSuccess: async (result) => { client.setToken(result.token); const current = await client.get<{ device: SessionInfo["device"]; user?: SessionInfo["user"] }>("/auth/session"); const session = { token: result.token, deviceId: result.deviceId, device: current.device, user: current.user }; setSession(session); writeStoredSession(session); writeStoredDevice(current.device); } });
}

export function useBootstrapStatusQuery() {
  const client = useApiClient();
  return useQuery({ queryKey: ["auth", "bootstrap-status"], queryFn: () => new AuthService(client).bootstrapStatus() });
}

export function useBootstrapMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({ mutationFn: (password: string) => new AuthService(client).bootstrap(password), onSuccess: (result) => { client.setToken(result.session.token); const session = { token: result.session.token, deviceId: result.session.deviceId, device: result.device, user: { id: "owner", username: "owner", role: "Owner" as const } }; setSession(session); writeStoredSession(session); writeStoredDevice(result.device); void queryClient.invalidateQueries({ queryKey: ["auth", "bootstrap-status"] }); } });
}

export function useInvitationMutation() {
  const client = useApiClient();
  return useMutation({ mutationFn: ({ origin, kind, staff }: { origin: string; kind?: "private" | "public-kiosk"; staff?: { name: string; role: "Cashier" | "Staff" } }) => new AuthService(client).createInvitation(origin, kind, staff) });
}

export function useDevicesQuery() {
  const client = useApiClient();
  return useQuery({ queryKey: ["pairing", "devices"], queryFn: () => new AuthService(client).listDevices() });
}

export function useRevokeDeviceMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (deviceId: string) => new AuthService(client).revokeDevice(deviceId), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pairing", "devices"] }) });
}

export function usePairingMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const setPairedDevice = useAuthStore((state) => state.setPairedDevice);
  return useMutation({ mutationFn: ({ token, mode, origin }: { token: string; mode: DeviceMode; origin?: string }) => new AuthService(client).pair(token, mode, origin), onSuccess: (result) => { setPairedDevice(result.device); writeStoredDevice(result.device); if (result.session) { client.setToken(result.session.token); const session = { ...result.session, device: result.device }; setSession(session); writeStoredSession(session); } queryClient.invalidateQueries({ queryKey: clientQueryKeys.session }); } });
}

export function useLogout() {
  const client = useApiClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  return () => { client.setToken(undefined); clearSession(); writeStoredSession(undefined); };
}

export function useRestoreSession() {
  const client = useApiClient();
  const setSession = useAuthStore((state) => state.setSession);
  const setPairedDevice = useAuthStore((state) => state.setPairedDevice);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const clear = useAuthStore((state) => state.clear);
  const stored = React.useMemo(readStoredSession, []);
  const device = React.useMemo(readStoredDevice, []);
  React.useEffect(() => {
    if (device) setPairedDevice(device);
    if (!stored) {
      setHydrated(true);
      return;
    }
    client.setToken(stored.token);
    client.get<{ device: typeof stored.device; user?: typeof stored.user }>("/auth/session").then((current) => setSession({ ...stored, ...current })).catch(() => { client.setToken(undefined); clear(); writeStoredSession(undefined); }).finally(() => setHydrated(true));
  }, [client, clear, device, setHydrated, setPairedDevice, setSession, stored]);
  return stored;
}

export function useLoginMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const pairedDevice = useAuthStore((state) => state.pairedDevice);
  return useMutation({ mutationFn: ({ deviceId, username, password }: { deviceId: string; username: string; password: string }) => new AuthService(client).login(deviceId, username, password), onSuccess: async (result) => { if (!pairedDevice) return; client.setToken(result.token); const current = await client.get<{ device: typeof pairedDevice; user?: SessionInfo["user"] }>("/auth/session"); const session = { token: result.token, deviceId: result.deviceId, device: current.device, user: current.user }; setSession(session); writeStoredSession(session); queryClient.invalidateQueries({ queryKey: clientQueryKeys.session }); } });
}
