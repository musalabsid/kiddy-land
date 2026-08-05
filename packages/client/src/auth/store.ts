import { create } from "zustand";
import type { SessionInfo } from "../api/types";

type AuthState = {
  session?: SessionInfo;
  pairedDevice?: SessionInfo["device"];
  setSession: (session?: SessionInfo) => void;
  setPairedDevice: (device?: SessionInfo["device"]) => void;
  clear: () => void;
  clearSession: () => void;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: undefined,
  pairedDevice: undefined,
  setSession: (session) => set({ session, pairedDevice: session?.device }),
  setPairedDevice: (pairedDevice) => set({ pairedDevice }),
  clear: () => set({ session: undefined, pairedDevice: undefined }),
  clearSession: () => set((state) => ({ session: undefined, pairedDevice: state.pairedDevice })),
  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),
}));

export const SESSION_STORAGE_KEY = "kiddy-land-session";
export const DEVICE_STORAGE_KEY = "kiddy-land-device";
export type StoredSession = Pick<SessionInfo, "token" | "deviceId" | "device" | "user">;
export function readStoredSession(): StoredSession | undefined {
  if (typeof window === "undefined") return undefined;
  try { return JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as StoredSession | undefined; } catch { return undefined; }
}
export function readStoredDevice(): SessionInfo["device"] | undefined {
  if (typeof window === "undefined") return undefined;
  try { return JSON.parse(window.localStorage.getItem(DEVICE_STORAGE_KEY) ?? "null") as SessionInfo["device"] | undefined; } catch { return undefined; }
}
export function writeStoredSession(session: SessionInfo | undefined) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
export function writeStoredDevice(device: SessionInfo["device"] | undefined) {
  if (typeof window === "undefined") return;
  if (device) window.localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(device));
  else window.localStorage.removeItem(DEVICE_STORAGE_KEY);
}
