import { describe, expect, test } from "bun:test";

import { createCalendarStore } from "../src/calendar.ts";
import { createInventoryStore } from "../src/inventory.ts";
import { createLifecycleStore } from "../src/lifecycle.ts";
import { createMembershipStore } from "../src/membership.ts";
import { createReportService } from "../src/reports.ts";
import { createSaleStore } from "../src/sale.ts";

describe("owner reports", () => {
  test("returns authoritative financial and live metrics with local filters", () => {
    const calendar = createCalendarStore();
    calendar.setWeeklyHours(
      "monday",
      { open: "00:00", close: "23:59" },
      "owner",
    );
    const pkg = calendar.upsertPackage(
      {
        name: "Play",
        includedMinutes: 90,
        weekdayPrice: 50000,
        weekendPrice: 50000,
        overridePrices: {},
        overtimeRate: 1000,
        deposit: 20000,
        depositPolicy: "return-remainder",
      },
      "owner",
    );
    const inventory = createInventoryStore();
    const membership = createMembershipStore();
    const sales = createSaleStore(calendar, undefined, inventory, membership);
    const lifecycle = createLifecycleStore(sales, calendar);
    const reports = createReportService(
      calendar,
      sales,
      lifecycle,
      inventory,
      membership,
    );
    sales.complete({
      idempotencyKey: "report-1",
      cashierId: "cashier",
      operatingDate: "2024-01-01",
      paymentMethod: "cash",
      lines: [{ childId: "child", packageId: pkg.id }],
    });
    const report = reports.financial({
      from: "2024-01-01",
      to: "2024-01-01",
      cashierId: "cashier",
    });
    expect(report.data.totals.ticketRevenue).toBe(50000);
    expect(report.data.totals.depositsReceived).toBe(20000);
    expect(reports.live().data.occupancy).toBe(0);
  });
});
