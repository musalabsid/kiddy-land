import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schemaMigrations = sqliteTable("schema_migrations", {
  version: integer("version").primaryKey(),
  appliedAt: integer("applied_at", { mode: "number" }).notNull(),
});

export const calendarState = sqliteTable("calendar_state", {
  id: integer("id").primaryKey(),
  timezone: text("timezone").notNull(),
  weeklyJson: text("weekly_json").notNull(),
  overridesJson: text("overrides_json").notNull(),
  packagesJson: text("packages_json").notNull(),
  auditJson: text("audit_json").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const salesState = sqliteTable("sales_state", {
  id: integer("id").primaryKey(),
  salesJson: text("sales_json").notNull(),
  printAttemptsJson: text("print_attempts_json").notNull(),
  receiptSequence: integer("receipt_sequence").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const inventoryState = sqliteTable("inventory_state", {
  id: integer("id").primaryKey(),
  stateJson: text("state_json").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const membershipState = sqliteTable("membership_state", {
  id: integer("id").primaryKey(),
  stateJson: text("state_json").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const lifecycleState = sqliteTable("lifecycle_state", {
  id: integer("id").primaryKey(),
  sessionsJson: text("sessions_json").notNull(),
  eventsJson: text("events_json").notNull(),
  recoveryJson: text("recovery_json").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const staffUsers = sqliteTable("staff_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  role: text("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const pairedDevices = sqliteTable("paired_devices", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  kind: text("kind").notNull(),
  revokedAt: integer("revoked_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
