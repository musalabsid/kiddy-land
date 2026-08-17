import { create } from "zustand";
import type { ConnectionState } from "../api/types";

type ConnectionStore = { state: ConnectionState; synchronized: boolean; setState: (state: ConnectionState, synchronized?: boolean) => void; markSynchronized: () => void };
export const useConnectionStore = create<ConnectionStore>((set) => ({ state: "connecting", synchronized: false, setState: (state, synchronized = false) => set({ state, synchronized }), markSynchronized: () => set({ state: "synchronized", synchronized: true }) }));
export const canMutate = (state: ConnectionState, synchronized: boolean) => state === "connected" || state === "synchronized" || synchronized;
