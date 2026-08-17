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

const modes: Array<{ value: DeviceMode; key: "auth.modeCashier" | "auth.modeEntrance" | "auth.modeExit" | "auth.modeInventory" | "auth.modeKiosk" | "auth.modeOwner" }> = [{ value: "Cashier", key: "auth.modeCashier" }, { value: "Entrance Scanner", key: "auth.modeEntrance" }, { value: "Exit Scanner", key: "auth.modeExit" }, { value: "Inventory", key: "auth.modeInventory" }, { value: "Public Kiosk", key: "auth.modeKiosk" }, { value: "Owner Dashboard", key: "auth.modeOwner" }];
const inputCls = "h-9 w-full border border-input bg-background px-2 text-sm";
const pairingSchema = z.object({ token: z.string().trim().min(1, "Invitation token is required") });
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
  return <Card><CardHeader><CardTitle>{t("auth.pairTitle")}</CardTitle><CardDescription>{t("auth.pairDescription")}</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={submit} noValidate>{enableScanner && <><QrPairingScanner onToken={(value) => setValue("token", value, { shouldValidate: true })} onSubmit={submitToken} /><p role="note" className="text-xs text-muted-foreground">{t("auth.pairCameraNote")} {t("auth.pairMobileLimit")}</p></>}<FormField label={t("auth.pairToken")} required htmlFor="pair-token" error={errors.token?.message}><input id="pair-token" className={inputCls} aria-invalid={errors.token ? true : undefined} {...register("token")} /></FormField><FormField label={t("auth.deviceMode")} required htmlFor="pair-mode"><Select id="pair-mode" className="h-9" value={mode} onChange={(event) => setMode(event.target.value as DeviceMode)}>{modes.map((item) => <option key={item.value} value={item.value}>{t(item.key)}</option>)}</Select></FormField><Button type="submit" disabled={mutation.isPending}>{t("auth.pair")}</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{t("auth.invalidInvitation")}</p>}</form></CardContent></Card>;
}
const passwordSchema = z.string().min(1, "Password is required");
export function OwnerLoginScreen({ onSuccess }: { onSuccess?: () => void } = {}) {
  const mutation = useOwnerLoginMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string }>({ resolver: zodResolver(z.object({ password: passwordSchema })), defaultValues: { password: "" } });
  return <Card><CardHeader><CardTitle>Owner login</CardTitle><CardDescription>Sign in to this host's Owner Dashboard.</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values.password, { onSuccess }))} noValidate><FormField label="Owner password" required htmlFor="owner-password" error={errors.password?.message}><span className="relative block"><input id="owner-password" aria-label="Owner password" className={`${inputCls} pr-10`} type="password" autoComplete="current-password" aria-invalid={errors.password ? true : undefined} {...register("password")} /><PasswordToggle /></span></FormField><Button type="submit" disabled={mutation.isPending || !!errors.password}>Login as owner</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>}</form></CardContent></Card>;
}
function PasswordToggle() {
  const [visible, setVisible] = React.useState(false);
  return <button type="button" className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>;
}
const bootstrapSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters"), confirmation: z.string() }).refine((data) => data.password === data.confirmation, { message: "Passwords do not match", path: ["confirmation"] });
function BootstrapScreen() {
  const mutation = useBootstrapMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string; confirmation: string }>({ resolver: zodResolver(bootstrapSchema), defaultValues: { password: "", confirmation: "" } });
  return <Card><CardHeader><CardTitle>Set up this host</CardTitle><CardDescription>Create the first local Owner Dashboard. No invitation token is needed.</CardDescription></CardHeader><CardContent><form className="grid gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values.password))} noValidate><p className="text-sm text-muted-foreground">Username: <strong>owner</strong></p><FormField label="Owner password" required htmlFor="bootstrap-password" error={errors.password?.message} hint="At least 8 characters."><input id="bootstrap-password" className={inputCls} type="password" autoComplete="new-password" aria-invalid={errors.password ? true : undefined} {...register("password")} /></FormField><FormField label="Confirm password" required htmlFor="bootstrap-confirmation" error={errors.confirmation?.message}><input id="bootstrap-confirmation" className={inputCls} type="password" autoComplete="new-password" aria-invalid={errors.confirmation ? true : undefined} {...register("confirmation")} /></FormField><Button type="submit" disabled={mutation.isPending}>Set up host</Button>{mutation.isError && <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>}</form></CardContent></Card>;
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
  return <main className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6"><div className="mx-auto w-full max-w-sm"><PairingScreen origin={origin} enableScanner={enableScanner} /></div></main>;
}
