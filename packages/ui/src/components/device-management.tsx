import * as React from "react";
import QRCode from "qrcode";
import { Copy, RefreshCw, Smartphone, Trash2, X } from "lucide-react";
import { useDevicesQuery, useInvitationMutation, useRevokeDeviceMutation, useDeleteDeviceMutation } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

export function DeviceManagement({ origin }: { origin: string }) {
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
  const create = () => invitation.mutate({ origin, kind, staff: kind === "private" && staffName.trim() ? { name: staffName.trim(), role: staffRole } : undefined }, { onSuccess: async (result) => { setToken(result.token); setQr(await QRCode.toDataURL(result.qrPayload, { margin: 2, width: 220 })); } });
  return <div className="grid gap-4">
    <Card>
      <CardHeader><CardTitle>Pair a device</CardTitle><CardDescription>Generate a one-time invitation. It expires after 60 seconds.</CardDescription></CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm"><span>Device kind</span><select className="h-9 border border-input bg-background px-2" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="private">Private device</option><option value="public-kiosk">Public kiosk</option></select></label>
            {kind === "private" && <><label className="grid gap-1 text-sm"><span>Employee name</span><input className="h-9 border border-input bg-background px-2" placeholder="e.g. Budi" value={staffName} onChange={(e) => setStaffName(e.target.value)} /></label><label className="grid gap-1 text-sm"><span>Role</span><select className="h-9 border border-input bg-background px-2" value={staffRole} onChange={(e) => setStaffRole(e.target.value as typeof staffRole)}><option value="Cashier">Cashier</option><option value="Staff">Staff</option></select></label></>}
            {invitation.isError && <p role="alert" className="text-sm text-destructive">Could not create invitation.</p>}
          </div>
          {/* Reserved right column — no layout shift when the QR appears. */}
          <div className="grid min-h-72 w-full gap-3 place-items-center border border-dashed p-4 md:w-80">
            {qr ? (
              <>
                <img src={qr} alt="Device pairing QR code" width={256} height={256} className="h-56 w-56" />
                <code className="max-w-full break-all text-center text-xs">{token}</code>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => token && void navigator.clipboard.writeText(token)}><Copy data-icon="inline-start" />Copy token</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setQr(undefined); setToken(undefined); }}>New invitation</Button>
                </div>
              </>
            ) : (
              <div className="grid justify-items-center gap-2 text-center">
                <Button onClick={create} disabled={invitation.isPending}><RefreshCw data-icon="inline-start" />Generate invitation</Button>
                <p className="text-xs text-muted-foreground">QR code appears here</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Paired devices</CardTitle><CardDescription>Revoke a lost device immediately, or delete it to remove its pairing history.</CardDescription></CardHeader>
      <CardContent className="grid gap-2">
        {devices.isLoading && <p className="text-sm text-muted-foreground">Loading devices…</p>}
        {devices.data?.devices.map((device) => { const isOwnerDevice = device.mode === "Owner Dashboard"; return <div className="flex items-center justify-between gap-3 border border-border p-3" key={device.id}>
          <div className="flex min-w-0 items-center gap-3"><Smartphone className="size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="font-medium">{device.mode}{isOwnerDevice && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Owner device</span>}</p><p className="truncate text-xs text-muted-foreground">{device.id} · {device.kind}</p></div></div>
          <div className="flex items-center gap-2">
            {device.revokedAt ? <span className="text-xs text-destructive">Revoked</span> : isOwnerDevice ? <span className="text-xs text-muted-foreground">Protected</span> : <Button variant="outline" size="sm" onClick={() => revoke.mutate(device.id)} disabled={revoke.isPending}><X data-icon="inline-start" />Revoke</Button>}
            {isOwnerDevice ? <span className="text-xs text-muted-foreground" title="The owner device cannot be removed">—</span> : confirming === device.id
              ? <span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Delete?</span><Button size="sm" variant="destructive" onClick={() => { remove.mutate(device.id); setConfirming(undefined); }} disabled={remove.isPending}>Yes, delete</Button><Button size="sm" variant="ghost" onClick={() => setConfirming(undefined)}>Cancel</Button></span>
              : <Button size="sm" variant="outline" onClick={() => setConfirming(device.id)} disabled={remove.isPending}><Trash2 data-icon="inline-start" />Delete</Button>}
          </div>
        </div>; })}
        {!devices.isLoading && !devices.data?.devices.length && <p className="text-sm text-muted-foreground">No paired devices.</p>}
      </CardContent>
    </Card>
  </div>;
}
