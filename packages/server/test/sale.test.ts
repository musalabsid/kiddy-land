import { describe, expect, test } from "bun:test";
import { createCalendarStore } from "../src/calendar.ts";
import { createSaleStore } from "../src/sale.ts";
import { createInventoryStore } from "../src/inventory.ts";

describe("cashier ticket sale", () => {
  function fixture() {
    const calendar = createCalendarStore();
    calendar.setWeeklyHours("monday", { open: "10:00", close: "20:00" }, "owner");
    const pkg = calendar.upsertPackage({ name: "Play", includedMinutes: 90, weekdayPrice: 50000, weekendPrice: 70000, overridePrices: {}, overtimeRate: 1000, deposit: 20000, depositPolicy: "return-remainder" }, "owner");
    return { store: createSaleStore(calendar), pkg };
  }
  test("atomically creates one receipt and independent tickets", () => {
    const { store, pkg } = fixture();
    const sale = store.complete({ idempotencyKey: "checkout-1", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "cash", lines: [{ childId: "child-1", packageId: pkg.id }, { childId: "child-2", packageId: pkg.id }] });
    expect(sale.tickets).toHaveLength(2);
    expect(new Set(sale.tickets.map((ticket) => ticket.id)).size).toBe(2);
    expect(sale.receipt.number).toBe("R-00000001");
  });
  test("duplicate submit returns original sale", () => {
    const { store, pkg } = fixture();
    const input = { idempotencyKey: "same", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "QRIS" as const, lines: [{ childId: "child", packageId: pkg.id, paymentConfirmed: true }] };
    expect(store.complete(input)).toBe(store.complete(input));
  });
  test("artifacts and print attempts are separate from completion", () => {
    const { store, pkg } = fixture();
    const sale = store.complete({ idempotencyKey: "print", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "bank-transfer", lines: [{ childId: "child", packageId: pkg.id, paymentConfirmed: true }] });
    expect(store.artifact(sale.id, "tickets").body.startsWith("%PDF")).toBe(true);
    expect(store.artifact(sale.id, "receipt").filename).toContain("R-");
    store.recordPrintAttempt({ saleId: sale.id, artifact: "tickets", actorId: "cashier", status: "unknown" });
    expect(store.get(sale.id)?.tickets).toHaveLength(1);
  });
  test("does not partially reserve duplicate product lines", () => {
    const calendar = createCalendarStore(); calendar.setWeeklyHours("monday", { open: "00:00", close: "23:59" }, "owner"); const inventory = createInventoryStore(); const product = inventory.create({ sku: "P", name: "Product", price: 100, stock: 1 }, "owner"); const sales = createSaleStore(calendar, undefined, inventory);
    expect(() => sales.complete({ idempotencyKey: "duplicate-product", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "cash", lines: [{ kind: "product", productId: product.id, quantity: 1 }, { kind: "product", productId: product.id, quantity: 1 }] })).toThrow("Insufficient stock"); expect(product.stock).toBe(1);
  });

  test("rejects sales outside the venue operating window", () => {
    const { store, pkg } = fixture();
    expect(() => store.complete({ idempotencyKey: "closed", cashierId: "cashier", operatingDate: "2024-01-01", at: Date.parse("2024-01-01T15:00:00Z"), paymentMethod: "cash", lines: [{ childId: "child", packageId: pkg.id }] })).toThrow("outside");
  });
  test("rejects invalid or partial payment methods", () => {
    const { store, pkg } = fixture();
    expect(() => store.complete({ idempotencyKey: "bad", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "cash", lines: [{ childId: "child", packageId: "missing" }] })).toThrow();
    expect(() => store.complete({ idempotencyKey: "bad-payment", cashierId: "cashier", operatingDate: "2024-01-01", paymentMethod: "cash+QRIS" as never, lines: [{ childId: "child", packageId: pkg.id }] })).toThrow();
  });
});
