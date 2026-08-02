import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { sql } from "drizzle-orm";
import * as schema from "./database-schema.ts";

export type LocalDatabase = {
  path: string;
  db: Database;
  orm: BunSQLiteDatabase<typeof schema>;
  close: () => void;
  integrityCheck: () => boolean;
};

export function openLocalDatabase(path: string): LocalDatabase {
  const directory = path.slice(0, path.lastIndexOf("/"));
  if (directory) mkdirSync(directory, { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  db.run("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const version = Number((db.query("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number }).version);
  if (version > 1) throw new Error(`Unsupported database schema version ${version}`);
  if (version < 1) {
    db.run(`CREATE TABLE IF NOT EXISTS calendar_state (
      id INTEGER PRIMARY KEY CHECK (id = 1), timezone TEXT NOT NULL,
      weekly_json TEXT NOT NULL, overrides_json TEXT NOT NULL,
      packages_json TEXT NOT NULL, audit_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, ?)", [Date.now()]);
  }
  const orm = drizzle(db, { schema });
  return { path, db, orm, close: () => db.close(), integrityCheck: () => (db.query("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check === "ok" };
}

export function readCalendarState(database: LocalDatabase) {
  return database.orm.all<{ timezone: string; weekly: string; overrides: string; packages: string; audit: string }>(sql`SELECT timezone, weekly_json AS weekly, overrides_json AS overrides, packages_json AS packages, audit_json AS audit FROM calendar_state WHERE id = 1`)[0] ?? null;
}

export function writeCalendarState(database: LocalDatabase, state: { timezone: string; weekly: unknown; overrides: unknown; packages: unknown; audit: unknown }) {
  database.orm.run(sql`INSERT INTO calendar_state(id, timezone, weekly_json, overrides_json, packages_json, audit_json, updated_at)
    VALUES (1, ${state.timezone}, ${JSON.stringify(state.weekly)}, ${JSON.stringify(state.overrides)}, ${JSON.stringify(state.packages)}, ${JSON.stringify(state.audit)}, ${Date.now()})
    ON CONFLICT(id) DO UPDATE SET timezone=excluded.timezone, weekly_json=excluded.weekly_json,
      overrides_json=excluded.overrides_json, packages_json=excluded.packages_json,
      audit_json=excluded.audit_json, updated_at=excluded.updated_at`);
}
