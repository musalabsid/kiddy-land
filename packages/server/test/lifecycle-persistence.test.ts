import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { openLocalDatabase } from "../src/database.ts";
import { createCalendarStore } from "../src/calendar.ts";
import { createLifecycleStore } from "../src/lifecycle.ts";
import { createSaleStore } from "../src/sale.ts";

describe("lifecycle persistence", () => {
  test("restores active session and recovery code state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kiddy-life-persist-")); const path = join(dir, "kiddy-land.sqlite");
    const db = openLocalDatabase(path); const calendar = createCalendarStore({ database: db }); calendar.setWeeklyHours("monday", { open: "00:00", close: "23:59" }, "owner"); const pkg = calendar.upsertPackage({ name: "Play", includedMinutes: 60, weekdayPrice: 1, weekendPrice: 1, overridePrices: {}, overtimeRate: 0, deposit: 0, depositPolicy: "return-remainder" }, "owner"); const sales = createSaleStore(calendar, db); const sale = sales.complete({ idempotencyKey: "lifecycle-persist", cashierId: "owner", operatingDate: "2024-01-01", paymentMethod: "cash", lines: [{ childId: "child", packageId: pkg.id }] }); const lifecycle = createLifecycleStore(sales, calendar, db); const entered = lifecycle.admit(sale.tickets[0]!.code, Date.parse("2024-01-01T10:00:00Z")); const recovered = lifecycle.recover(sale.tickets[0]!.code, "child"); db.close();
    const reopened = openLocalDatabase(path); const reopenedCalendar = createCalendarStore({ database: reopened }); const reopenedSales = createSaleStore(reopenedCalendar, reopened); const restored = createLifecycleStore(reopenedSales, reopenedCalendar, reopened); expect(restored.sessions.get(sale.tickets[0]!.id)?.id).toBe(entered.session?.id); expect(restored.admit(recovered.code).message).toBe("Ticket already admitted"); reopened.close(); await rm(dir, { recursive: true, force: true });
  });
});
