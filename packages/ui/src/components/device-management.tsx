import * as React from "react";
import QRCode from "qrcode";
import { Copy, RefreshCw, Smartphone, X } from "lucide-react";
import { useDevicesQuery, useInvitationMutation, useRevokeDeviceMutation } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

export function DeviceManagement({ origin }: { origin: string }) {
  const invitation = useInvitationMutation();
  const devices = useDevicesQuery();
  const revoke = useRevokeDeviceMutation();
  const [kind, setKind] = React.useState<"private" | "public-kiosk">("private");
  const [qr, setQr] = React.useState<string>();
  const [token, setToken] = React.useState<string>();
  const create = () => invitation.mutate({ origin, kind }, { onSuccess: async (result) => { setToken(result.token); setQr(await QRCode.toDataURL(result.qrPayload, { margin: 2, width: 220 })); } });
  return <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
    <Card>
      <CardHeader><CardTitle>Pair a device</CardTitle><CardDescription>Generate a one-time invitation. It expires after 60 seconds.</CardDescription></CardHeader>
      <CardContent className="grid gap-4">
        <label className="grid gap-1 text-sm"><span>Device kind</span><select className="h-9 border border-input bg-background px-2" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="private">Private device</option><option value="public-kiosk">Public kiosk</option></select></label>
        <Button onClick={create} disabled={invitation.isPending}><RefreshCw data-icon="inline-start" />Generate invitation</Button>
        {qr && <div className="grid justify-items-center gap-3 border border-border p-4"><img src={qr} alt="Device pairing QR code" width={220} height={220} /><code className="max-w-full break-all text-center text-xs">{token}</code><Button variant="outline" onClick={() => token && void navigator.clipboard.writeText(token)}><Copy data-icon="inline-start" />Copy token</Button></div>}
        {invitation.isError && <p role="alert" className="text-sm text-destructive">Could not create invitation.</p>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Paired devices</CardTitle><CardDescription>Revoke lost or untrusted devices immediately.</CardDescription></CardHeader>
      <CardContent className="grid gap-2">
        {devices.isLoading && <p className="text-sm text-muted-foreground">Loading devices…</p>}
        {devices.data?.devices.map((device) => <div className="flex items-center justify-between gap-3 border border-border p-3" key={device.id}><div className="flex min-w-0 items-center gap-3"><Smartphone className="size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="font-medium">{device.mode}</p><p className="truncate text-xs text-muted-foreground">{device.id} · {device.kind}</p></div></div>{device.revokedAt ? <span className="text-xs text-destructive">Revoked</span> : <Button variant="outline" size="sm" onClick={() => revoke.mutate(device.id)} disabled={revoke.isPending}><X data-icon="inline-start" />Revoke</Button>}</div>)}
        {!devices.isLoading && !devices.data?.devices.length && <p className="text-sm text-muted-foreground">No paired devices.</p>}
      </CardContent>
    </Card>
  </section>;
}
