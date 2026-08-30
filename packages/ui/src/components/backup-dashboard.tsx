import * as React from "react";
import { useBackups, useBackupNow, useRestoreBackup, useStageRestoreBackup, useDeleteBackup, useVenueSettings } from "@kiddy-land/client";
import type { BackupRecord } from "@kiddy-land/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@workspace/ui/components/alert-dialog";
import { Input } from "@workspace/ui/components/input";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Trash2, ShieldCheck, Database, Clock } from "lucide-react";
function formatAge(ms?: number) {
  if (ms == null) return "—";
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
export function BackupDashboard() {
  const { t, locale } = useLocale();
  const backups = useBackups();
  const create = useBackupNow();
  const stage = useStageRestoreBackup();
  const restore = useRestoreBackup();
  const del = useDeleteBackup();
  const busy = create.isPending || stage.isPending || restore.isPending || del.isPending;
  const venue = useVenueSettings();
  const health = backups.data?.health as { destination?: string; ageMs?: number; latest?: { createdAt: number; sizeBytes: number; appVersion: string; schemaVersion: number } } | undefined;
  const latest = health?.latest;
  const [restoreTarget, setRestoreTarget] = React.useState<BackupRecord | null>(null);
  const [restoreInput, setRestoreInput] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<BackupRecord | null>(null);
  const canRestore = restoreTarget && restoreInput === `RESTORE ${restoreTarget.id}`;
  return (
    <div className="w-full max-w-6xl px-5 py-8 sm:px-8"><header className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("backup.pageEyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("backup.pageTitle")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("backup.pageDescription")}</p></header><div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("backup.title")}</CardTitle>
          <CardDescription>{t("backup.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded border bg-muted/20 p-3 text-sm">
            <p className="font-medium">{t("backup.howItWorks")}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>{t("backup.step1")}</li>
              <li>{t("backup.step2").replace("{id}", "ID")}</li>
              <li>{t("backup.step3")}</li>
              <li>{t("backup.step4")}</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">Destination: <span className="font-mono break-all">{health?.destination ?? "Unavailable"}</span> · Auto backup: {venue.data?.backupInterval ?? "daily"}, keep 10</p>
          </div>
          <div className="grid gap-2 rounded border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium"><Clock className="size-4 text-foreground dark:!text-white" />{t("backup.latestTitle")}</div>
            {latest ? (
              <div className="grid gap-1 text-muted-foreground">
                <span>{new Date(latest.createdAt).toLocaleString(locale)} · {formatAge(health?.ageMs)} · {formatBytes(latest.sizeBytes)} · app {latest.appVersion} · schema {latest.schemaVersion}</span>
                <span className="text-xs">Destination: <span className="font-mono break-all">{health?.destination}</span></span>
              </div>
            ) : (
              <span className="text-muted-foreground">{t("backup.noBackup")}</span>
            )}
            <Button onClick={() => create.mutate()} disabled={busy}>{t("backup.backupNow")}</Button>
          </div>
          {(create.error || stage.error || restore.error || del.error) && (
            <Alert variant="destructive"><AlertTitle>Action failed</AlertTitle><AlertDescription>{(create.error || stage.error || restore.error || del.error)?.message}</AlertDescription></Alert>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("backup.allBackups")}</CardTitle><CardDescription>{backups.data?.backups.length ?? 0} records</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {backups.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : backups.data?.backups.length === 0 ? <p className="text-sm text-muted-foreground">{t("backup.noBackup")}</p> : backups.data?.backups.map((backup) => (
            <div className="grid gap-2 border p-3 text-sm" key={backup.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><Database className="size-4" />{new Date(backup.createdAt).toLocaleString(locale)} · <span className={backup.status === "verified" ? "text-green-600" : "text-destructive"}>{backup.status}</span> · {formatBytes(backup.sizeBytes)}</span>
                <span className="flex gap-2">
                  {backup.status === "verified" && (
                    <Button variant="destructive" size="sm" disabled={busy} onClick={() => { setRestoreTarget(backup); setRestoreInput(""); }}><ShieldCheck className="size-4" />{t("backup.restore")}</Button>
                  )}
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setDeleteTarget(backup)}><Trash2 className="size-4" />{t("backup.delete")}</Button>
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all">{backup.destination} · schema {backup.schemaVersion} · app {backup.appVersion}</p>
              {backup.error && <p className="text-destructive">Backup failed: {backup.error}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription className="grid gap-2">
              <span>This will replace the live database with the selected backup. A safety copy of the current data is made first and verified.</span>
              <span className="rounded bg-muted p-2 font-mono text-xs break-all">{restoreTarget?.id} · {restoreTarget ? new Date(restoreTarget.createdAt).toLocaleString(locale) : ""} · {restoreTarget ? formatBytes(restoreTarget.sizeBytes) : ""}</span>
              <span>While staged (10 min) new sales are blocked. If verification fails, the safety copy is restored automatically. This cannot be undone without another restore.</span>
              <span>Type <span className="font-mono font-medium">RESTORE {restoreTarget?.id}</span> to confirm.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={restoreInput} onChange={(e) => setRestoreInput(e.target.value)} placeholder={`RESTORE ${restoreTarget?.id ?? ""}`} autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!canRestore || busy} onClick={() => { if (!restoreTarget || !canRestore) return; const confirmation = restoreInput; stage.mutate({ id: restoreTarget.id, confirmation }, { onSuccess: () => restore.mutate({ id: restoreTarget.id, confirmation }, { onSuccess: () => setRestoreTarget(null) }) }); }}>{t("backup.restore")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
            <AlertDialogDescription className="grid gap-2">
              <span>This will permanently delete the backup file and remove it from the manifest.</span>
              <span className="rounded bg-muted p-2 font-mono text-xs break-all">{deleteTarget?.id} · {deleteTarget ? new Date(deleteTarget.createdAt).toLocaleString(locale) : ""} · {deleteTarget ? formatBytes(deleteTarget.sizeBytes) : ""}</span>
              <span>Deleted backups cannot be restored. This does not affect the live database. Only failed or old verified backups should be deleted — the 10 newest verified are kept automatically.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={() => { if (!deleteTarget) return; del.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }}>{t("backup.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}
