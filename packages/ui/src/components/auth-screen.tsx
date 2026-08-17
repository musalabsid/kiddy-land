import * as React from "react";
import { useLocale } from "@kiddy-land/localization/react";
import { useBootstrapMutation, useBootstrapStatusQuery, useOwnerLoginMutation, usePairingMutation, useSession } from "@kiddy-land/client/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { DeviceMode } from "@kiddy-land/client";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { QrPairingScanner } from "@workspace/ui/components/qr-pairing-scanner";
import { modeDefaultRoutes } from "@workspace/ui/components/route-access-guard";

const modes: Array<{ value: DeviceMode; key: "auth.modeCashier" | "auth.modeEntrance" | "auth.modeExit" | "auth.modeInventory" | "auth.modeKiosk" | "auth.modeOwner" }> = [{ value: "Cashier", key: "auth.modeCashier" }, { value: "Entrance Scanner", key: "auth.modeEntrance" }, { value: "Exit Scanner", key: "auth.modeExit" }, { value: "Inventory", key: "auth.modeInventory" }, { value: "Public Kiosk", key: "auth.modeKiosk" }, { value: "Owner Dashboard", key: "auth.modeOwner" }];
export function PairingScreen({ origin, enableScanner = false }: { origin: string; enableScanner?: boolean }) {
  const { t } = useLocale(); const mutation = usePairingMutation(); const { session } = useSession(); const navigate = useNavigate(); const location = useLocation(); const [token, setToken] = React.useState(""); const [mode, setMode] = React.useState<DeviceMode>("Cashier");
  React.useEffect(() => {
    if (!mutation.isSuccess || !session) return;
    const target = modeDefaultRoutes[session.device.mode] as never;
    if (location.pathname !== target) void navigate({ to: target, replace: true });
  }, [location.pathname, modeDefaultRoutes, mutation.isSuccess, navigate, session]);
  const submit = (value?: string) => { const valueToUse = value ?? token; if (valueToUse.trim()) mutation.mutate({ token: valueToUse.trim(), mode, origin }); };
  return <Card><CardHeader><CardTitle>{t("auth.pairTitle")}</CardTitle><CardDescription>{t("auth.pairDescription")}</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>{enableScanner && <><QrPairingScanner onToken={setToken} onSubmit={submit} /><p role="note" className="text-xs text-muted-foreground">{t("auth.pairCameraNote")} {t("auth.pairMobileLimit")}</p></>}<label className="grid gap-1 text-xs"><span>{t("auth.pairToken")}</span><input aria-label={t("auth.pairToken")} className="h-9 border border-input bg-background px-2 text-sm" value={token} onChange={(event) => setToken(event.target.value)} required /></label><label className="grid gap-1 text-xs"><span>{t("auth.deviceMode")}</span><select className="h-9 border border-input bg-background px-2" value={mode} onChange={(event) => setMode(event.target.value as DeviceMode)}>{modes.map((item) => <option key={item.value} value={item.value}>{t(item.key)}</option>)}</select></label><Button type="submit" disabled={mutation.isPending}>{t("auth.pair")}</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{t("auth.invalidInvitation")}</p>}</form></CardContent></Card>;
}
function PasswordField({ label, value, onChange, autoComplete, minLength }: { label: string; value: string; onChange: (value: string) => void; autoComplete?: string; minLength?: number }) {
  const [visible, setVisible] = React.useState(false);
  return <label className="grid gap-1 text-xs"><span>{label}</span><span className="relative"><input aria-label={label} className="h-9 w-full border border-input bg-background px-2 pr-10 text-sm" type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} value={value} onChange={(event) => onChange(event.target.value)} required /><button type="button" className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>;
}
export function OwnerLoginScreen({ onSuccess }: { onSuccess?: () => void } = {}) {
  const mutation = useOwnerLoginMutation();
  const [password, setPassword] = React.useState("");
  return <Card><CardHeader><CardTitle>Owner login</CardTitle><CardDescription>Sign in to this host's Owner Dashboard.</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); mutation.mutate(password, { onSuccess }); }}><PasswordField label="Owner password" value={password} onChange={setPassword} autoComplete="current-password" /><Button type="submit" disabled={mutation.isPending || !password}>Login as owner</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>}</form></CardContent></Card>;
}
function BootstrapScreen() {
  const mutation = useBootstrapMutation();
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const mismatch = confirmation.length > 0 && password !== confirmation;
  return <Card><CardHeader><CardTitle>Set up this host</CardTitle><CardDescription>Create the first local Owner Dashboard. No invitation token is needed.</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (!mismatch) mutation.mutate(password); }}><p className="text-sm text-muted-foreground">Username: <strong>owner</strong></p><PasswordField label="Owner password" value={password} onChange={setPassword} minLength={8} autoComplete="new-password" /><PasswordField label="Confirm password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" /><Button type="submit" disabled={mutation.isPending || password.length < 8 || mismatch}>Set up host</Button>{mismatch && <p role="alert" className="text-xs text-destructive">Passwords do not match.</p>}{mutation.isError && <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>}</form></CardContent></Card>;
}
export function AuthScreen({ origin, children, enableScanner = false }: { origin: string; children?: React.ReactNode; enableScanner?: boolean }) {
  const { session, pairedDevice } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const bootstrap = useBootstrapStatusQuery();
  React.useEffect(() => {
    if (!session || location.pathname !== "/") return;
    void navigate({ to: modeDefaultRoutes[session.device.mode] as never, replace: true });
  }, [location.pathname, navigate, session]);
  if (session) return <>{children}</>;
  if (bootstrap.data?.required) return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto w-full max-w-sm"><BootstrapScreen /></div></main>;
  if (bootstrap.data?.ownerDevice && !pairedDevice) return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto grid w-full max-w-sm gap-3"><PairingScreen origin={origin} enableScanner={enableScanner} /><a href="/owner-login" className="text-center text-sm text-primary underline-offset-4 hover:underline">Login as owner</a></div></main>;
  // Private devices are now always paired with a staff account (auto-login).
  // On session expiry, re-pair instead of asking for credentials nobody has.
  return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto w-full max-w-sm"><PairingScreen origin={origin} enableScanner={enableScanner} /></div></main>;
}
