import { describe, expect, test } from "bun:test";
import { createCalendarStore } from "../src/calendar.ts";

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

  test("validates unlimited packages and operating boundaries", () => {
    const calendar = createCalendarStore();
    expect(() => calendar.upsertPackage({ name: "Unlimited", includedMinutes: 60, weekdayPrice: 1, weekendPrice: 1, overridePrices: {}, overtimeRate: 0, deposit: 0, depositPolicy: "unlimited-cap" }, "owner")).toThrow();
    calendar.setWeeklyHours("monday", { open: "10:00", close: "20:00" }, "owner");
    expect(calendar.canOperate("2024-01-01", "20:00").allowed).toBe(false);
  });
});
