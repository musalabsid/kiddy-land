import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import type { LocalDatabase } from "./database.ts";

export type BackupStatus = "verified" | "failed";
export type BackupRecord = { id: string; createdAt: number; appVersion: string; schemaVersion: number; sizeBytes: number; destination: string; status: BackupStatus; error?: string };

export function createBackupService(database: LocalDatabase, destination: string, schemaVersion = 5, appVersion = "1.0.0") {
  const manifestPath = join(destination, "manifest.json");
  let records: BackupRecord[] = [];
  let staged: { id: string; stagedAt: number } | undefined;
  async function load() {
    try {
      const value: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
      if (!Array.isArray(value) || value.some((item) => { const record = item as Partial<BackupRecord>; return !item || typeof item !== "object" || typeof record.id !== "string" || typeof record.destination !== "string" || !Number.isFinite(record.createdAt) || !Number.isFinite(record.schemaVersion) || !Number.isFinite(record.sizeBytes) || !["verified", "failed"].includes(record.status ?? ""); })) throw new Error("Backup manifest is invalid");
      records = value as BackupRecord[];
    } catch (error) { records = []; if (error instanceof Error && error.message === "Backup manifest is invalid") throw error; if (error instanceof SyntaxError) throw new Error("Backup manifest is invalid"); }
    return records;
  }
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
    const good = records.filter((item) => item.status === "verified" && item.id !== staged?.id);
    for (const item of good.slice(keep)) { try { await rm(item.destination, { force: true }); } catch {} }
    records = records.filter((item) => item.status !== "verified" || item.id === staged?.id || good.indexOf(item) < keep); await save();
  }
  async function prepareRestore(id: string, confirm: string) {
    const selected = records.find((item) => item.id === id && item.status === "verified");
    if (!selected) throw new Error("Verified backup not found");
    if (confirm !== `RESTORE ${id}`) throw new Error("Explicit restore confirmation required");
    if (!(await verify(selected.destination))) throw new Error("Selected backup is no longer valid");
    staged = { id, stagedAt: Date.now() };
    const safety = await backup("pre-restore"); if (safety.status !== "verified") { staged = undefined; throw new Error("Safety backup failed"); }
    return { restored: selected, safety };
  }
  async function replacePrepared(id: string) {
    if (!staged || staged.id !== id || Date.now() - staged.stagedAt > 10 * 60_000) { staged = undefined; throw new Error("Restore is not staged or has expired"); }
    const selected = records.find((item) => item.id === id && item.status === "verified");
    if (!selected) throw new Error("Verified backup not found");
    const temporary = `${database.path}.restore-${Date.now()}`;
    const rollback = `${database.path}.rollback-${Date.now()}`;
    try {
      await cp(selected.destination, temporary);
      if (!(await verify(temporary))) throw new Error("Restored database integrity check failed");
      await rm(`${database.path}-wal`, { force: true }); await rm(`${database.path}-shm`, { force: true });
      await rename(database.path, rollback);
      try { await rename(temporary, database.path); } catch (error) { try { await rename(rollback, database.path); } catch {} throw error; }
      if (!(await verify(database.path))) {
        await rm(database.path, { force: true });
        try { await rename(rollback, database.path); } catch { throw new Error("Restore failed and safety database requires manual recovery"); }
        throw new Error("Restored database integrity check failed");
      }
      await rm(rollback, { force: true }); staged = undefined; return selected;
    } catch (error) { await rm(temporary, { force: true }); throw error; }
  }
  return { load, health, backup, prepareRestore, replacePrepared, prune, records: () => records, verify, staged: () => staged };
}
export type BackupService = ReturnType<typeof createBackupService>;
