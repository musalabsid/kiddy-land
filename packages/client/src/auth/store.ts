import { create } from "zustand";
import type { SessionInfo } from "../api/types";

type AuthState = { session?: SessionInfo; setSession: (session?: SessionInfo) => void; clear: () => void; hydrated: boolean; setHydrated: (hydrated: boolean) => void };
export const useAuthStore = create<AuthState>((set) => ({ session: undefined, setSession: (session) => set({ session }), clear: () => set({ session: undefined }), hydrated: false, setHydrated: (hydrated) => set({ hydrated }) }));
