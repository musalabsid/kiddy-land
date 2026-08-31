import * as React from "react";
import QRCode from "qrcode";
import { Copy, RefreshCw, Smartphone, Trash2, X } from "lucide-react";
import { useDevicesQuery, useInvitationMutation, useRevokeDeviceMutation, useDeleteDeviceMutation } from "@kiddy-land/client/react";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Button } from "@workspace/ui/components/button";
import { FormField } from "@workspace/ui/components/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

export function DeviceManagement({ origin }: { origin: string }) {
  const { t } = useLocale();
  const invitation = useInvitationMutation();
  const devices = useDevicesQuery();
  const revoke = useRevokeDeviceMutation();
  const remove = useDeleteDeviceMutation();
  const [kind, setKind] = React.useState<"private" | "public-kiosk">("private");
  const [staffName, setStaffName] = React.useState("");
  const [staffRole, setStaffRole] = React.useState<"Cashier" | "Staff">("Cashier");
  const [qr, setQr] = React.useState<string>();
  const [token, setToken] = React.useState<string>();
  const [confirming, setConfirming] = React.useState<string>();
  const [touched, setTouched] = React.useState(false);
  const create = () => { if (kind === "private" && !staffName.trim()) { setTouched(true); return; } invitation.mutate({ origin, kind, staff: kind === "private" ? { name: staffName.trim(), role: staffRole } : undefined }, { onSuccess: async (result) => { setToken(result.token); setQr(await QRCode.toDataURL(result.qrPayload, { margin: 2, width: 220 })); setStaffName(""); setTouched(false); } }); };
  return <div className="w-full max-w-6xl px-5 py-8 sm:px-8"><header className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("device.pageEyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("device.pageTitle")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("device.pageDescription")}</p></header><div className="grid gap-4">
    <Card>
      <CardHeader><CardTitle>{t("device.pairTitle")}</CardTitle><CardDescription>{t("device.pairDescription")}</CardDescription></CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm"><span>{t("device.deviceKind")}</span><select disabled={!!qr} className="h-9 border border-input bg-background px-2 disabled:opacity-50 disabled:cursor-not-allowed" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="private">{t("device.privateDevice")}</option><option value="public-kiosk">{t("device.publicKiosk")}</option></select></label>
            {kind === "private" && <><FormField label={t("device.employeeName")} required htmlFor="pairing-staff-name" error={touched && !staffName.trim() ? t("device.employeeRequired") : undefined}><input id="pairing-staff-name" disabled={!!qr} className="h-9 border border-input bg-background px-2 disabled:opacity-50 disabled:cursor-not-allowed" placeholder={t("device.employeePlaceholder")} value={staffName} onChange={(e) => setStaffName(e.target.value)} onBlur={() => setTouched(true)} /></FormField><FormField label={t("device.role")} required htmlFor="pairing-staff-role"><select id="pairing-staff-role" disabled={!!qr} className="h-9 border border-input bg-background px-2 disabled:opacity-50 disabled:cursor-not-allowed" value={staffRole} onChange={(e) => setStaffRole(e.target.value as typeof staffRole)}><option value="Cashier">Cashier</option><option value="Staff">Staff</option></select></FormField></>}
            {invitation.isError && <p role="alert" className="text-sm text-destructive">{t("device.couldNotCreate")}</p>}
          </div>
          {/* Reserved right column — no layout shift when the QR appears. */}
          <div className="grid min-h-72 w-full gap-3 place-items-center border border-dashed p-4 md:w-80">
            {qr ? (
              <>
                <img src={qr} alt="Device pairing QR code" width={256} height={256} className="h-56 w-56" />
                <code className="max-w-full break-all text-center text-xs">{token}</code>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => token && void navigator.clipboard.writeText(token)}><Copy data-icon="inline-start" />{t("device.copyToken")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setQr(undefined); setToken(undefined); }}>{t("device.newInvitation")}</Button>
                </div>
              </>
            ) : (
              <div className="grid justify-items-center gap-2 text-center">
                <Button onClick={create} disabled={invitation.isPending || (kind === "private" && !staffName.trim())}><RefreshCw data-icon="inline-start" />{t("device.generateInvitation")}</Button>
                <p className="text-xs text-muted-foreground">{t("device.qrAppears")}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{t("device.pairedTitle")}</CardTitle><CardDescription>{t("device.pairedDescription")}</CardDescription></CardHeader>
      <CardContent className="grid gap-2">
        {devices.isLoading && <p className="text-sm text-muted-foreground">{t("device.loadingDevices")}</p>}
        {devices.data?.devices.map((device) => { const isOwnerDevice = device.mode === "Owner Dashboard"; return <div className="flex items-center justify-between gap-3 border border-border p-3" key={device.id}>
          <div className="flex min-w-0 items-center gap-3"><Smartphone className="size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="font-medium">{device.employeeName ?? device.mode}{isOwnerDevice && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{t("device.ownerDevice")}</span>}{device.employeeName && device.mode !== device.employeeName && <span className="ml-2 text-xs text-muted-foreground">· {device.mode}</span>}</p><p className="truncate text-xs text-muted-foreground">{device.id} · {device.kind}{device.employeeName ? ` · ${device.employeeName}` : ""}</p></div></div>
          <div className="flex items-center gap-2">
            {device.revokedAt ? <span className="text-xs text-destructive">{t("device.revoked")}</span> : isOwnerDevice ? <span className="text-xs text-muted-foreground">{t("device.protected")}</span> : <Button variant="outline" size="sm" onClick={() => revoke.mutate(device.id)} disabled={revoke.isPending}><X data-icon="inline-start" />{t("device.revoke")}</Button>}
            {isOwnerDevice ? <span className="text-xs text-muted-foreground" title="The owner device cannot be removed">—</span> : confirming === device.id
              ? <span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{t("device.deleteConfirm")}</span><Button size="sm" variant="destructive" onClick={() => { remove.mutate(device.id); setConfirming(undefined); }} disabled={remove.isPending}>{t("device.yesDelete")}</Button><Button size="sm" variant="ghost" onClick={() => setConfirming(undefined)}>{t("device.cancel")}</Button></span>
              : <Button size="sm" variant="outline" onClick={() => setConfirming(device.id)} disabled={remove.isPending}><Trash2 data-icon="inline-start" />{t("device.delete")}</Button>}
          </div>
        </div>; })}
        {!devices.isLoading && !devices.data?.devices.length && <p className="text-sm text-muted-foreground">{t("device.noPaired")}</p>}
      </CardContent>
    </Card>
  </div></div>;
}
