import { create } from "zustand";

import type {
  PaymentMethod,
  ProductLineInput,
  ProductRecord,
  TicketLineInput,
} from "../api/types";

export type CashierDraft = {
  packageId: string;
  ticketCount: number;
  member?: {
    id: string;
    childId: string;
    code: string;
    name: string;
    phone?: string;
    status?: "active" | "deactivated";
  };
  lines: Array<TicketLineInput | ProductLineInput>;
  paymentMethod: PaymentMethod;
  confirmed: boolean;
  product?: ProductRecord;
  products: Record<string, ProductRecord>;
  productQuantity: number;
};

const initial: CashierDraft = {
  packageId: "",
  ticketCount: 1,
  lines: [],
  paymentMethod: "cash",
  confirmed: false,
  products: {},
  productQuantity: 1,
};

type CashierDraftActions = {
  set: (draft: Partial<CashierDraft>) => void;
  reset: () => void;
};

export const useCashierDraftStore = create<CashierDraft & CashierDraftActions>(
  (set) => ({
    ...initial,
    set: (draft) => set(draft),
    reset: () =>
      set({ ...initial, products: {}, member: undefined, product: undefined }),
  }),
);
