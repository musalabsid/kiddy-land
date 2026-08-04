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
  transaction: <T>(work: () => T) => T;
};

export function openLocalDatabase(path: string): LocalDatabase {
  const directory = path.slice(0, path.lastIndexOf("/"));
  if (directory) mkdirSync(directory, { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  db.run("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const version = Number((db.query("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number }).version);
  if (version > 6) throw new Error(`Unsupported database schema version ${version}`);
  if (version < 1) {
    db.run(`CREATE TABLE IF NOT EXISTS calendar_state (
      id INTEGER PRIMARY KEY CHECK (id = 1), timezone TEXT NOT NULL,
      weekly_json TEXT NOT NULL, overrides_json TEXT NOT NULL,
      packages_json TEXT NOT NULL, audit_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, ?)", [Date.now()]);
  }
  if (version < 2) {
    db.run(`CREATE TABLE IF NOT EXISTS sales_state (id INTEGER PRIMARY KEY CHECK (id = 1), sales_json TEXT NOT NULL, print_attempts_json TEXT NOT NULL, receipt_sequence INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
    db.run("INSERT OR IGNORE INTO sales_state(id, sales_json, print_attempts_json, receipt_sequence, updated_at) VALUES (1, '[]', '[]', 0, ?)", [Date.now()]);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, ?)", [Date.now()]);
  }
  if (version < 3) {
    db.run(`CREATE TABLE IF NOT EXISTS lifecycle_state (id INTEGER PRIMARY KEY CHECK (id = 1), sessions_json TEXT NOT NULL, events_json TEXT NOT NULL, recovery_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
    db.run("INSERT OR IGNORE INTO lifecycle_state(id, sessions_json, events_json, recovery_json, updated_at) VALUES (1, '{}', '[]', '{}', ?)", [Date.now()]);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (3, ?)", [Date.now()]);
  }
  if (version < 4) {
    db.run(`CREATE TABLE IF NOT EXISTS inventory_state (id INTEGER PRIMARY KEY CHECK (id = 1), state_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
    db.run("INSERT OR IGNORE INTO inventory_state(id, state_json, updated_at) VALUES (1, ?, ?)", [JSON.stringify({ products: [], movements: [], counts: [], exceptions: [], refunds: [] }), Date.now()]);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (4, ?)", [Date.now()]);
  }
  if (version < 5) {
    db.run(`CREATE TABLE IF NOT EXISTS membership_state (id INTEGER PRIMARY KEY CHECK (id = 1), state_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
    db.run("INSERT OR IGNORE INTO membership_state(id, state_json, updated_at) VALUES (1, ?, ?)", [JSON.stringify({ children: [], members: [], discounts: { ticketPackages: {}, products: {} }, events: [] }), Date.now()]);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (5, ?)", [Date.now()]);
  }
  if (version < 6) {
    db.run(`CREATE TABLE IF NOT EXISTS staff_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, role TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS paired_devices (id TEXT PRIMARY KEY, mode TEXT NOT NULL, kind TEXT NOT NULL, revoked_at INTEGER, created_at INTEGER NOT NULL)`);
    db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (6, ?)", [Date.now()]);
  }
  const orm = drizzle(db, { schema });
  const transaction = <T,>(work: () => T): T => { db.run("BEGIN IMMEDIATE"); try { const result = work(); db.run("COMMIT"); return result; } catch (error) { db.run("ROLLBACK"); throw error; } };
  return { path, db, orm, close: () => db.close(), integrityCheck: () => (db.query("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check === "ok", transaction };
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
