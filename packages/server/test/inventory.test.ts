import { describe, expect, test } from "bun:test";
import { createInventoryStore } from "../src/inventory.ts";

describe("product inventory", () => {
  test("catalog, intake, count approval, and search", () => {
    const inventory = createInventoryStore(); const product = inventory.create({ sku: "SNACK-1", name: "Snack", barcode: "123", price: 5000, stock: 2, lowStockThreshold: 1 }, "owner");
    expect(inventory.list("123")).toHaveLength(1); inventory.intake(product.id, 3, "staff", "Delivery"); const count = inventory.submitCount(product.id, 4, "staff"); expect(product.stock).toBe(5); inventory.approveCount(count.id, "owner"); expect(product.stock).toBe(4); expect(inventory.movements.length).toBe(3);
  });
  test("rejects ordinary oversell and supports auditable exception", () => {
    const inventory = createInventoryStore(); const product = inventory.create({ sku: "ITEM", name: "Item", price: 100, stock: 1 }, "owner"); expect(() => inventory.reserve(product.id, 2, "cashier")).toThrow("Insufficient stock"); const result = inventory.reserve(product.id, 2, "cashier", { ownerId: "owner", reason: "Approved exception" }); expect(result.exception?.reason).toBe("Approved exception"); expect(product.stock).toBe(-1);
  });
  test("refund disposition changes stock only when returned", () => {
    const inventory = createInventoryStore(); const product = inventory.create({ sku: "ITEM", name: "Item", price: 100, stock: 0 }, "owner"); inventory.refund({ idempotencyKey: "r1", saleId: "sale", lineId: "line", productId: product.id, quantity: 1, disposition: "return-to-stock", reason: "Unopened", actorId: "owner" }); expect(product.stock).toBe(1); inventory.refund({ idempotencyKey: "r2", saleId: "sale", lineId: "line", productId: product.id, quantity: 1, disposition: "damaged-consumed", reason: "Damaged", actorId: "owner" }); expect(product.stock).toBe(1);
  });
});
