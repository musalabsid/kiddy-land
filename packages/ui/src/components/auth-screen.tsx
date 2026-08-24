import * as React from "react";
import { useLocale } from "@kiddy-land/localization/react";
import { useBootstrapMutation, useBootstrapStatusQuery, useOwnerLoginMutation, usePairingMutation, useSession } from "@kiddy-land/client/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DeviceMode } from "@kiddy-land/client";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { Select } from "@workspace/ui/components/select";
import { QrPairingScanner } from "@workspace/ui/components/qr-pairing-scanner";
import { modeDefaultRoutes } from "@workspace/ui/components/route-access-guard";

const modes: Array<{ value: DeviceMode; key: "auth.modeCashier" | "auth.modeScanner" | "auth.modeKiosk" }> = [{ value: "Cashier", key: "auth.modeCashier" }, { value: "Scanner", key: "auth.modeScanner" }, { value: "Public Kiosk", key: "auth.modeKiosk" }];
const inputCls = "h-9 w-full border border-input bg-background px-2 text-sm";
const pairingSchema = z.object({ token: z.string().trim().min(1, "Invitation token is required") }); // ponytail: message translated via FormField error display
type PairingValues = z.infer<typeof pairingSchema>;
export function PairingScreen({ origin, enableScanner = false }: { origin: string; enableScanner?: boolean }) {
  const { t } = useLocale(); const mutation = usePairingMutation(); const { session } = useSession(); const navigate = useNavigate(); const location = useLocation(); const [mode, setMode] = React.useState<DeviceMode>("Cashier");
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PairingValues>({ resolver: zodResolver(pairingSchema), defaultValues: { token: "" } });
  React.useEffect(() => {
    if (!mutation.isSuccess || !session) return;
    const target = modeDefaultRoutes[session.device.mode] as never;
    if (location.pathname !== target) void navigate({ to: target, replace: true });
  }, [location.pathname, modeDefaultRoutes, mutation.isSuccess, navigate, session]);
  const submit = handleSubmit((values) => mutation.mutate({ token: values.token, mode, origin }));
  const submitToken = (value: string) => mutation.mutate({ token: value.trim(), mode, origin });
  return <Card><CardHeader><CardTitle>{t("auth.pairTitle")}</CardTitle><CardDescription>{t("auth.pairDescription")}</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={submit} noValidate>{enableScanner && <><QrPairingScanner onToken={(value) => setValue("token", value, { shouldValidate: true })} onSubmit={submitToken} /><p role="note" className="text-xs text-muted-foreground">{t("auth.pairCameraNote")} {t("auth.pairMobileLimit")}</p></>}<FormField label={t("auth.pairToken")} required htmlFor="pair-token" error={errors.token?.message}><input id="pair-token" className={inputCls} aria-invalid={errors.token ? true : undefined} {...register("token")} /></FormField><FormField label={t("auth.deviceMode")} required htmlFor="pair-mode"><Select id="pair-mode" className="h-9" value={mode} onChange={(event) => setMode(event.target.value as DeviceMode)}>{modes.map((item) => <option key={item.value} value={item.value}>{t(item.key)}</option>)}</Select></FormField><Button type="submit" disabled={mutation.isPending}>{t("auth.pair")}</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{(() => { const msg=(mutation.error as Error).message; if(msg.startsWith("Role ")) return msg.replace("Role ", "").replace(" cannot use ", " → ").replace(" device — ", " ").replace(" requires ", " need "); if(msg.includes("Public kiosk invitation")) return t("auth.publicKioskOnly"); if(msg.includes("invalid or expired")) return t("auth.invitationExpired"); if(msg.includes("revoked or unknown")) return t("auth.deviceRevoked"); return t("auth.invalidInvitation"); })()}</p>}</form></CardContent></Card>;
}
const passwordSchema = z.string().min(1, "Password is required");
export function OwnerLoginScreen({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { t } = useLocale();
  const mutation = useOwnerLoginMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string }>({ resolver: zodResolver(z.object({ password: z.string().min(1, t("auth.passwordRequired")) })), defaultValues: { password: "" } });
  const authError = (msg?: string) => {
    if (!msg) return t("auth.invalidCredentials");
    if (msg.includes("Invalid credentials")) return t("auth.invalidCredentials");
    if (msg.includes("Host is already set up")) return t("auth.alreadySetup");
    return msg;
  };
  return <Card><CardHeader><CardTitle>{t("auth.ownerLoginTitle")}</CardTitle><CardDescription>{t("auth.ownerLoginDescription")}</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values.password, { onSuccess }))} noValidate><FormField label={t("auth.ownerPassword")} required htmlFor="owner-password" error={errors.password?.message}><span className="relative block"><input id="owner-password" aria-label={t("auth.ownerPassword")} className={`${inputCls} pr-10`} type="password" autoComplete="current-password" aria-invalid={errors.password ? true : undefined} {...register("password")} /><PasswordToggle /></span></FormField><Button type="submit" disabled={mutation.isPending || !!errors.password}>{t("auth.loginAsOwner")}</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{authError((mutation.error as Error).message)}</p>}</form></CardContent></Card>;
}
function PasswordToggle() {
  const [visible, setVisible] = React.useState(false);
  return <button type="button" className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>;
}
const bootstrapSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters"), confirmation: z.string() }).refine((data) => data.password === data.confirmation, { message: "Passwords do not match", path: ["confirmation"] });
function BootstrapScreen() {
  const { t } = useLocale();
  const mutation = useBootstrapMutation();
  const schema = z.object({ password: z.string().min(8, t("auth.passwordMin8")), confirmation: z.string() }).refine((data) => data.password === data.confirmation, { message: t("auth.passwordsDoNotMatch"), path: ["confirmation"] });
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string; confirmation: string }>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmation: "" } });
  const authError = (msg?: string) => {
    if (!msg) return "";
    if (msg.includes("at least 8 characters")) return t("auth.passwordMin8");
    if (msg.includes("Passwords do not match")) return t("auth.passwordsDoNotMatch");
    if (msg.includes("Host is already set up")) return t("auth.alreadySetup");
    return msg;
  };
  return <Card><CardHeader><CardTitle>{t("auth.setupTitle")}</CardTitle><CardDescription>{t("auth.setupDescription")}</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values.password))} noValidate><p className="text-sm text-muted-foreground">{t("auth.username")}: <strong>owner</strong></p><FormField label={t("auth.ownerPassword")} required htmlFor="bootstrap-password" error={errors.password?.message ? authError(errors.password.message) : undefined} hint={t("auth.passwordMin8")}><input id="bootstrap-password" className={inputCls} type="password" autoComplete="new-password" aria-invalid={errors.password ? true : undefined} {...register("password")} /></FormField><FormField label={t("auth.confirmPassword")} required htmlFor="bootstrap-confirmation" error={errors.confirmation?.message ? authError(errors.confirmation.message) : undefined}><input id="bootstrap-confirmation" className={inputCls} type="password" autoComplete="new-password" aria-invalid={errors.confirmation ? true : undefined} {...register("confirmation")} /></FormField><Button type="submit" disabled={mutation.isPending}>{t("auth.setupHost")}</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{authError((mutation.error as Error).message)}</p>}</form></CardContent></Card>;
}
export function AuthScreen({ origin, children, enableScanner = false }: { origin: string; children?: React.ReactNode; enableScanner?: boolean }) {
  const { t } = useLocale();
  const { session, pairedDevice } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const bootstrap = useBootstrapStatusQuery();
  React.useEffect(() => {
    if (!session || location.pathname !== "/") return;
    void navigate({ to: modeDefaultRoutes[session.device.mode] as never, replace: true });
  }, [location.pathname, navigate, session]);
  React.useEffect(() => {
    if (!session) return;
    const target = modeDefaultRoutes[session.device.mode] as never;
    if (!target || location.pathname === target) return;
    const isOwner = session.user?.role === "Owner";
    if (isOwner) return;
    const mismatched =
      (location.pathname === "/kiosk" && session.device.mode !== "Public Kiosk") ||
      ((location.pathname === "/sales" || location.pathname === "/members") && session.device.mode !== "Cashier") ||
      (location.pathname.startsWith("/scanner") && session.device.mode !== "Scanner") ||
      (location.pathname === "/inventory" && session.device.mode !== "Inventory") ||
      (location.pathname === "/" && session.device.mode !== "Owner Dashboard");
    if (mismatched) void navigate({ to: target, replace: true });
  }, [location.pathname, navigate, session]);
  if (session) return <>{children}</>;
  if (bootstrap.data?.required) return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto w-full max-w-sm"><BootstrapScreen /></div></main>;
  if (bootstrap.data?.ownerDevice && !pairedDevice) return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto grid w-full max-w-sm gap-3"><PairingScreen origin={origin} enableScanner={enableScanner} /><a href="/owner-login" className="text-center text-sm text-primary underline-offset-4 hover:underline">{t("auth.loginAsOwner")}</a></div></main>;
  return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto w-full max-w-sm"><PairingScreen origin={origin} enableScanner={enableScanner} /></div></main>;
}
