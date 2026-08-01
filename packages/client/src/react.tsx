import * as React from "react";
import { ApiClient, canMutate, type ConnectionState, type SessionInfo } from "./index";

type ClientContextValue = { client: ApiClient; session?: SessionInfo; setSession: (session?: SessionInfo) => void; connection: ConnectionState; synchronized: boolean; canMutate: boolean };
const ClientContext = React.createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children, origin }: { children: React.ReactNode; origin: string }) {
  const client = React.useMemo(() => new ApiClient(origin), [origin]);
  const [session, setSession] = React.useState<SessionInfo>();
  const [connection, setConnection] = React.useState<ConnectionState>("connecting");
  const [synchronized, setSynchronized] = React.useState(false);
  React.useEffect(() => { let active = true; const check = async () => { try { await fetch(`${origin}/ready`); if (active) { setConnection("connected"); setSynchronized(true); } } catch { if (active) { setConnection("read-only"); setSynchronized(false); } } }; void check(); const timer = window.setInterval(() => void check(), 5000); return () => { active = false; window.clearInterval(timer); }; }, [origin]);
  const value = React.useMemo(() => ({ client, session, setSession, connection, synchronized, canMutate: canMutate(connection === "connected" || connection === "synchronized", synchronized) }), [client, session, connection, synchronized]);
  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
export function useClient() { const value = React.useContext(ClientContext); if (!value) throw new Error("useClient must be used inside ClientProvider"); return value; }
