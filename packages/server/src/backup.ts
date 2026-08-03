import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import type { LocalDatabase } from "./database.ts";

export type BackupStatus = "verified" | "failed";
export type BackupRecord = { id: string; createdAt: number; appVersion: string; schemaVersion: number; sizeBytes: number; destination: string; status: BackupStatus; error?: string };

export function createBackupService(database: LocalDatabase, destination: string, schemaVersion = 5, appVersion = "1.0.0") {
  const manifestPath = join(destination, "manifest.json");
  let records: BackupRecord[] = [];
  let staged: { id: string; stagedAt: number } | undefined;
  async function load() { try { records = JSON.parse(await readFile(manifestPath, "utf8")) as BackupRecord[]; } catch { records = []; } return records; }
  function health() { const latest = records.find((item) => item.status === "verified"); return { latest, ageMs: latest ? Date.now() - latest.createdAt : undefined, destination, destinationHealthy: Boolean(latest) }; }
  async function save() { await mkdir(destination, { recursive: true }); await writeFile(manifestPath, JSON.stringify(records, null, 2)); }
  async function verify(path: string) { const db = new Database(path); try { return (db.query("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check === "ok"; } finally { db.close(); } }
  async function backup(reason = "on-demand") {
    await mkdir(destination, { recursive: true });
    const id = `backup-${Date.now()}`; const path = join(destination, `${id}.sqlite`); const createdAt = Date.now();
    try {
      database.db.run("PRAGMA wal_checkpoint(TRUNCATE)");
      database.db.run(`VACUUM INTO '${path.replaceAll("'", "''")}'`);
      const verified = await verify(path); if (!verified) throw new Error("Backup integrity check failed");
      const sizeBytes = (await stat(path)).size;
      const record: BackupRecord = { id, createdAt, appVersion, schemaVersion, sizeBytes, destination: path, status: "verified" };
      records = [record, ...records.filter((item) => item.status === "verified")]; await save(); await prune(); return { ...record, reason };
    } catch (error) {
      const record: BackupRecord = { id, createdAt, appVersion, schemaVersion, sizeBytes: 0, destination: path, status: "failed", error: error instanceof Error ? error.message : String(error) }; records = [record, ...records]; await save(); return record;
    }
  }
  async function prune(keep = 7) {
    const good = records.filter((item) => item.status === "verified");
    for (const item of good.slice(keep)) { try { await rm(item.destination, { force: true }); } catch {} }
    records = records.filter((item) => item.status !== "verified" || good.indexOf(item) < keep); await save();
  }
  async function restore(id: string, confirm: string) {
    const selected = records.find((item) => item.id === id && item.status === "verified");
    if (!selected) throw new Error("Verified backup not found");
    if (confirm !== `RESTORE ${id}`) throw new Error("Explicit restore confirmation required");
    staged = { id, stagedAt: Date.now() };
    const safety = await backup("pre-restore"); if (safety.status !== "verified") throw new Error("Safety backup failed");
    if (!(await verify(selected.destination))) throw new Error("Selected backup is no longer valid");
    await cp(selected.destination, database.path);
    if (!database.integrityCheck()) throw new Error("Restored database integrity check failed");
    staged = undefined;
    return { restored: selected, safety };
  }
  return { load, health, backup, restore, prune, records: () => records, verify, staged: () => staged };
}
export type BackupService = ReturnType<typeof createBackupService>;
