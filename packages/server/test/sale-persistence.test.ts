import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createCalendarStore } from "../src/calendar.ts";
import { openLocalDatabase } from "../src/database.ts";
import { createSaleStore } from "../src/sale.ts";

describe("sale persistence", () => {
  test("restores committed sales, idempotency, sequence, and print attempts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kiddy-sale-persist-"));
    const path = join(dir, "kiddy-land.sqlite");
    const firstDb = openLocalDatabase(path);
    const calendar = createCalendarStore({ database: firstDb });
    calendar.setWeeklyHours(
      "monday",
      { open: "00:00", close: "23:59" },
      "owner",
    );
    const pkg = calendar.upsertPackage(
      {
        name: "Play",
        includedMinutes: 60,
        weekdayPrice: 50000,
        weekendPrice: 50000,
        overridePrices: {},
        overtimeRate: 0,
        deposit: 0,
        depositPolicy: "return-remainder",
      },
      "owner",
    );
    const first = createSaleStore(calendar, firstDb);
    const sale = first.complete({
      idempotencyKey: "persisted",
      cashierId: "owner",
      operatingDate: "2024-01-01",
      paymentMethod: "cash",
      lines: [{ childId: "child", packageId: pkg.id }],
    });
    first.recordPrintAttempt({
      saleId: sale.id,
      artifact: "receipt",
      actorId: "owner",
      status: "failed",
    });
    firstDb.close();
    const secondDb = openLocalDatabase(path);
    const secondCalendar = createCalendarStore({ database: secondDb });
    const second = createSaleStore(secondCalendar, secondDb);
    expect(second.get(sale.id)?.receipt.number).toBe(sale.receipt.number);
    expect(second.printAttempts).toHaveLength(1);
    expect(
      second.complete({
        idempotencyKey: "persisted",
        cashierId: "owner",
        operatingDate: "2024-01-01",
        paymentMethod: "cash",
        lines: [{ childId: "child", packageId: pkg.id }],
      }).id,
    ).toBe(sale.id);
    secondDb.close();
    await rm(dir, { recursive: true, force: true });
  });
});
