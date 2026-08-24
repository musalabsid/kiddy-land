import { describe, expect, test } from "bun:test";
import { createCalendarStore } from "../src/calendar.ts";
import { openLocalDatabase } from "../src/database.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function calendarForValidation() { const calendar = createCalendarStore(); calendar.setWeeklyHours("monday", { open: "10:00", close: "20:00" }, "owner"); return calendar; }

describe("venue calendar and ticket packages", () => {
  test("derives venue-local operating dates and schedule overrides", () => {
    const calendar = createCalendarStore({ timezone: "Asia/Jakarta" });
    expect(calendar.operatingDate(new Date("2024-01-01T17:30:00Z"))).toBe("2024-01-02");
    calendar.setWeeklyHours("monday", { open: "09:00", close: "18:00" }, "owner");
    expect(calendar.effectiveSchedule("2024-01-01").hours).toEqual({ open: "09:00", close: "18:00" });
    calendar.setOverride({ date: "2024-01-01", kind: "closed", reason: "Public holiday" }, "owner");
    expect(calendar.canOperate("2024-01-01", "12:00").reason).toBe("Public holiday");
  });

  test("supports pricing overrides and immutable package snapshots", () => {
    const calendar = createCalendarStore();
    calendar.setWeeklyHours("monday", { open: "10:00", close: "20:00" }, "owner");
    const packageValue = calendar.upsertPackage({ name: "90 Minutes", includedMinutes: 90, weekdayPrice: 50000, weekendPrice: 70000, overridePrices: {}, overtimeRate: 1000, deposit: 20000, depositPolicy: "return-remainder" }, "owner");
    const first = calendar.snapshot(packageValue.id, "2024-01-01");
    expect(first.price).toBe(50000);
    const changed = calendar.upsertPackage({ ...packageValue, weekdayPrice: 60000 }, "owner");
    expect(changed.version).toBe(2);
    expect(first.price).toBe(50000);
    expect(calendar.snapshot(packageValue.id, "2024-01-01").price).toBe(60000);
  });

  test("persists venue configuration and audit history across store instances", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "kiddy-calendar-"));
    const database = openLocalDatabase(join(dataDir, "kiddy-land.sqlite"));
    const first = createCalendarStore({ database });
    first.setTimezone("Asia/Singapore", "owner");
    first.setWeeklyHours("monday", { open: "09:00", close: "18:00" }, "owner");
    const packageValue = first.upsertPackage({ name: "Persisted", includedMinutes: 60, weekdayPrice: 40000, weekendPrice: 50000, overridePrices: {}, overtimeRate: 1000, deposit: 10000, depositPolicy: "return-remainder" }, "owner");
    database.close();
    const reopened = openLocalDatabase(join(dataDir, "kiddy-land.sqlite"));
    const second = createCalendarStore({ database: reopened });
    expect(second.timezone).toBe("Asia/Singapore");
    expect(second.weekly.monday).toEqual({ open: "09:00", close: "18:00" });
    expect(second.packages.get(packageValue.id)?.name).toBe("Persisted");
    expect(second.audit).toHaveLength(3);
    reopened.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  test("validates unlimited packages and operating boundaries", () => {
    expect(() => calendarForValidation().upsertPackage({ name: "Bad", includedMinutes: 60, weekdayPrice: 1, weekendPrice: 1, overridePrices: { "2024-01-01": -1 }, overtimeRate: 0, deposit: 0, depositPolicy: "return-remainder" }, "owner")).toThrow();
    const calendar = createCalendarStore();
    expect(calendar.upsertPackage({ name: "Gradual", includedMinutes: 60, weekdayPrice: 1, weekendPrice: 1, overridePrices: {}, overtimeRate: 0, overtimeThreshold: 5, overtimePercentage: 10, deposit: 0, depositPolicy: "unlimited-cap" }, "owner").depositPolicy).toBe("unlimited-cap");
    calendar.setWeeklyHours("monday", { open: "10:00", close: "20:00" }, "owner");
    expect(calendar.canOperate("2024-01-01", "20:00").allowed).toBe(false);
  });
});
