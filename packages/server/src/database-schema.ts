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
