import { sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import type { LocalDatabase } from "./database.ts";

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  archived: boolean;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
};
export type StockMovement = {
  id: string;
  productId: string;
  type:
    | "intake"
    | "count-variance"
    | "sale"
    | "refund-return"
    | "refund-damaged"
    | "exception-sale";
  quantity: number;
  before: number;
  after: number;
  actorId: string;
  reason?: string;
  at: number;
};
export type StockCount = {
  id: string;
  productId: string;
  counted: number;
  variance: number;
  actorId: string;
  status: "pending" | "approved";
  approvedBy?: string;
  at: number;
  approvedAt?: number;
};
export type InventoryException = {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  actorId: string;
  at: number;
};
export type ProductRefund = {
  id: string;
  idempotencyKey: string;
  saleId: string;
  lineId: string;
  productId: string;
  quantity: number;
  disposition: "return-to-stock" | "damaged-consumed";
  reason: string;
  actorId: string;
  at: number;
};
export type ProductSnapshot = {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
};
function id(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}
function validateText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required`);
}

export function createInventoryStore(database?: LocalDatabase) {
  const products = new Map<string, ProductRecord>();
  const movements: StockMovement[] = [];
  const counts: StockCount[] = [];
  const exceptions: InventoryException[] = [];
  const refunds: ProductRefund[] = [];
  const refundKeys = new Map<string, ProductRefund>();
  if (database) {
    const row = database.orm.all<{ state: string }>(
      sql`SELECT state_json AS state FROM inventory_state WHERE id = 1`,
    )[0];
    if (row) {
      const state = JSON.parse(row.state) as Record<string, unknown>;
      for (const product of (state.products as ProductRecord[]) ?? [])
        products.set(product.id, product);
      movements.push(...((state.movements as StockMovement[]) ?? []));
      counts.push(...((state.counts as StockCount[]) ?? []));
      exceptions.push(...((state.exceptions as InventoryException[]) ?? []));
      refunds.push(...((state.refunds as ProductRefund[]) ?? []));
      for (const refund of refunds)
        refundKeys.set(refund.idempotencyKey, refund);
    }
  }
  const persist = () => {
    if (!database) return;
    database.orm.run(
      sql`UPDATE inventory_state SET state_json = ${JSON.stringify({ products: [...products.values()], movements, counts, exceptions, refunds })}, updated_at = ${Date.now()} WHERE id = 1`,
    );
  };
  function product(idValue: string) {
    const item = products.get(idValue);
    if (!item) throw new Error("Product not found");
    return item;
  }
  function create(
    input: {
      sku: string;
      name: string;
      barcode?: string;
      price: number;
      stock?: number;
      lowStockThreshold?: number;
    },
    actorId: string,
  ) {
    validateText(input.sku, "SKU");
    validateText(input.name, "Name");
    if (
      !Number.isInteger(input.price) ||
      input.price < 0 ||
      !Number.isInteger(input.stock ?? 0) ||
      (input.stock ?? 0) < 0 ||
      !Number.isInteger(input.lowStockThreshold ?? 0) ||
      (input.lowStockThreshold ?? 0) < 0
    )
      throw new Error("Invalid product values");
    if (
      [...products.values()].some(
        (item) =>
          item.sku.toLowerCase() === input.sku.toLowerCase() ||
          (input.barcode && item.barcode === input.barcode),
      )
    )
      throw new Error("SKU or barcode already exists");
    const now = Date.now();
    const item: ProductRecord = {
      id: id("product"),
      sku: input.sku.trim(),
      name: input.name.trim(),
      barcode: input.barcode?.trim() || undefined,
      price: input.price,
      stock: input.stock ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? 0,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    products.set(item.id, item);
    if (item.stock)
      movements.push({
        id: id("movement"),
        productId: item.id,
        type: "intake",
        quantity: item.stock,
        before: 0,
        after: item.stock,
        actorId,
        reason: "Initial stock",
        at: now,
      });
    persist();
    return item;
  }
  function update(
    idValue: string,
    input: Partial<
      Pick<
        ProductRecord,
        "sku" | "name" | "barcode" | "price" | "lowStockThreshold"
      >
    >,
  ) {
    const item = product(idValue);
    const sku = input.sku?.trim();
    const name = input.name?.trim();
    const barcode = input.barcode?.trim() || undefined;
    if (sku !== undefined) validateText(sku, "SKU");
    if (name !== undefined) validateText(name, "Name");
    if (
      input.price !== undefined &&
      (!Number.isInteger(input.price) || input.price < 0)
    )
      throw new Error("Invalid price");
    if (
      input.lowStockThreshold !== undefined &&
      (!Number.isInteger(input.lowStockThreshold) ||
        input.lowStockThreshold < 0)
    )
      throw new Error("Invalid low-stock threshold");
    if (
      sku &&
      [...products.values()].some(
        (other) =>
          other.id !== idValue && other.sku.toLowerCase() === sku.toLowerCase(),
      )
    )
      throw new Error("SKU already exists");
    if (
      barcode &&
      [...products.values()].some(
        (other) => other.id !== idValue && other.barcode === barcode,
      )
    )
      throw new Error("Barcode already exists");
    Object.assign(item, {
      ...input,
      ...(sku === undefined ? {} : { sku }),
      ...(name === undefined ? {} : { name }),
      barcode,
      updatedAt: Date.now(),
    });
    persist();
    return item;
  }
  function archive(idValue: string) {
    const item = product(idValue);
    item.archived = true;
    item.updatedAt = Date.now();
    persist();
    return item;
  }
  function reactivate(idValue: string) {
    const item = product(idValue);
    item.archived = false;
    item.updatedAt = Date.now();
    persist();
    return item;
  }
  function setImage(idValue: string, imageUrl?: string) {
    const item = product(idValue);
    item.imageUrl = imageUrl;
    item.updatedAt = Date.now();
    persist();
    return item;
  }
  function list(search?: string, includeArchived = false, limit = 10) {
    const needle = search?.trim().toLowerCase();
    const sold = new Map<string, number>();
    for (const m of movements)
      if (m.type === "sale" || m.type === "exception-sale")
        sold.set(
          m.productId,
          (sold.get(m.productId) ?? 0) + Math.abs(m.quantity),
        );
    const filtered = [...products.values()].filter(
      (item) =>
        (includeArchived || !item.archived) &&
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.sku.toLowerCase().includes(needle) ||
          item.barcode?.toLowerCase() === needle),
    );
    filtered.sort(
      (a, b) =>
        (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0) ||
        b.createdAt - a.createdAt,
    );
    if (!needle) return filtered.slice(0, limit);
    return filtered;
  }
  function intake(
    productId: string,
    quantity: number,
    actorId: string,
    reason: string,
  ) {
    validateText(reason, "Reason");
    if (!Number.isInteger(quantity) || quantity <= 0)
      throw new Error("Quantity must be a positive integer");
    const item = product(productId);
    const before = item.stock;
    item.stock += quantity;
    movements.push({
      id: id("movement"),
      productId,
      type: "intake",
      quantity,
      before,
      after: item.stock,
      actorId,
      reason,
      at: Date.now(),
    });
    persist();
    return item;
  }
  function submitCount(productId: string, counted: number, actorId: string) {
    if (!Number.isInteger(counted) || counted < 0)
      throw new Error("Count must be a non-negative integer");
    const item = product(productId);
    const count: StockCount = {
      id: id("count"),
      productId,
      counted,
      variance: counted - item.stock,
      actorId,
      status: "pending",
      at: Date.now(),
    };
    counts.push(count);
    persist();
    return count;
  }
  function approveCount(countId: string, actorId: string) {
    const count = counts.find((item) => item.id === countId);
    if (!count || count.status !== "pending")
      throw new Error("Count unavailable");
    const item = product(count.productId);
    const before = item.stock;
    item.stock = count.counted;
    count.status = "approved";
    count.approvedBy = actorId;
    count.approvedAt = Date.now();
    movements.push({
      id: id("movement"),
      productId: item.id,
      type: "count-variance",
      quantity: item.stock - before,
      before,
      after: item.stock,
      actorId,
      reason: `Count ${count.id}`,
      at: Date.now(),
    });
    persist();
    return count;
  }
  function reserve(
    productId: string,
    quantity: number,
    actorId: string,
    exception?: { reason: string; ownerId: string },
  ) {
    return reserveBatch([{ productId, quantity, actorId, exception }])[0]!;
  }
  function reserveBatch(
    lines: Array<{
      productId: string;
      quantity: number;
      actorId: string;
      exception?: { reason: string; ownerId: string };
    }>,
  ) {
    const grouped = new Map<
      string,
      {
        quantity: number;
        exception?: { reason: string; ownerId: string };
        actorId: string;
      }
    >();
    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0)
        throw new Error("Quantity must be a positive integer");
      const prior = grouped.get(line.productId);
      grouped.set(line.productId, {
        quantity: (prior?.quantity ?? 0) + line.quantity,
        exception: line.exception ?? prior?.exception,
        actorId: line.actorId,
      });
    }
    const checked = [...grouped.entries()].map(([productId, line]) => {
      const item = product(productId);
      if (item.archived) throw new Error("Product archived");
      if (
        item.stock < line.quantity &&
        (!line.exception?.reason.trim() || !line.exception.ownerId)
      )
        throw new Error("Insufficient stock");
      return { productId, ...line, item };
    });
    const result = [];
    for (const line of checked) {
      const before = line.item.stock;
      const exceptional = before < line.quantity;
      line.item.stock -= line.quantity;
      if (exceptional) {
        const record: InventoryException = {
          id: id("exception"),
          productId: line.productId,
          quantity: line.quantity,
          reason: line.exception!.reason,
          actorId: line.exception!.ownerId,
          at: Date.now(),
        };
        exceptions.push(record);
        movements.push({
          id: id("movement"),
          productId: line.productId,
          type: "exception-sale",
          quantity: -line.quantity,
          before,
          after: line.item.stock,
          actorId: line.exception!.ownerId,
          reason: line.exception!.reason,
          at: record.at,
        });
        result.push({ item: line.item, exception: record });
      } else {
        movements.push({
          id: id("movement"),
          productId: line.productId,
          type: "sale",
          quantity: -line.quantity,
          before,
          after: line.item.stock,
          actorId: line.actorId,
          at: Date.now(),
        });
        result.push({ item: line.item });
      }
    }
    persist();
    return result;
  }
  function refund(input: {
    idempotencyKey: string;
    saleId: string;
    lineId: string;
    productId: string;
    quantity: number;
    disposition: ProductRefund["disposition"];
    reason: string;
    actorId: string;
  }) {
    validateText(input.idempotencyKey, "Idempotency key");
    const existing = refundKeys.get(input.idempotencyKey);
    if (existing) return existing;
    validateText(input.reason, "Reason");
    if (
      input.disposition !== "return-to-stock" &&
      input.disposition !== "damaged-consumed"
    )
      throw new Error("Invalid refund disposition");
    const item = product(input.productId);
    if (!Number.isInteger(input.quantity) || input.quantity <= 0)
      throw new Error("Invalid refund quantity");
    if (input.disposition === "return-to-stock") {
      const before = item.stock;
      item.stock += input.quantity;
      movements.push({
        id: id("movement"),
        productId: item.id,
        type: "refund-return",
        quantity: input.quantity,
        before,
        after: item.stock,
        actorId: input.actorId,
        reason: input.reason,
        at: Date.now(),
      });
    } else
      movements.push({
        id: id("movement"),
        productId: item.id,
        type: "refund-damaged",
        quantity: 0,
        before: item.stock,
        after: item.stock,
        actorId: input.actorId,
        reason: input.reason,
        at: Date.now(),
      });
    const record: ProductRefund = {
      id: id("refund"),
      ...input,
      at: Date.now(),
    };
    refunds.push(record);
    refundKeys.set(record.idempotencyKey, record);
    persist();
    return record;
  }
  return {
    products,
    movements,
    counts,
    exceptions,
    refunds,
    create,
    update,
    archive,
    reactivate,
    setImage,
    list,
    intake,
    submitCount,
    approveCount,
    reserve,
    reserveBatch,
    refund,
    persist,
  };
}
export type InventoryStore = ReturnType<typeof createInventoryStore>;
