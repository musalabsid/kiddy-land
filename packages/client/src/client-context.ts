import * as React from "react";
import type { ApiClient } from "./api/client";
export const ClientContext = React.createContext<ApiClient | undefined>(undefined);
export function useClient() { const client = React.useContext(ClientContext); if (!client) throw new Error("useClient must be used inside ClientProvider"); return client; }
