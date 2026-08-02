import { randomBytes } from "node:crypto";
import type { CalendarStore, PackageSnapshot } from "./calendar.ts";
import type { LocalDatabase } from "./database.ts";
import type { InventoryStore, ProductSnapshot } from "./inventory.ts";
import { sql } from "drizzle-orm";
import QRCode from "qrcode";

export const PAYMENT_METHODS = ["cash", "QRIS", "bank-transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type TicketLineInput = { kind?: "ticket"; childId: string; childName?: string; packageId: string; paymentConfirmed?: boolean };
export type ProductLineInput = { kind: "product"; productId: string; quantity: number; discount?: number; outOfStockException?: { reason: string; ownerId: string } };
export type SaleStatus = "completed" | "void";
export type TicketRecord = { id: string; code: string; qrToken: string; childId: string; childName?: string; package: PackageSnapshot; status: "waiting" };
export type ReceiptLine = { kind: "ticket"; ticketId: string; childId: string; packageName: string; price: number; deposit: number } | { kind: "product"; lineId: string; productId: string; sku: string; productName: string; quantity: number; unitPrice: number; discount: number; total: number };
export type SaleLineInput = TicketLineInput | ProductLineInput;
export type DepositRecord = { ticketId: string; amount: number; status: "held" };
export type ReceiptRecord = { id: string; number: string; saleId: string; locale: "id" | "en"; lines: ReceiptLine[]; total: number };
export type SaleRecord = { id: string; idempotencyKey: string; cashierId: string; operatingDate: string; paymentMethod: PaymentMethod; paymentConfirmedAt: number; status: SaleStatus; tickets: TicketRecord[]; deposits: DepositRecord[]; receipt: ReceiptRecord; lines: ReceiptLine[]; total: number; createdAt: number };
export type PrintAttempt = { id: string; saleId: string; artifact: "tickets" | "receipt"; status: "requested" | "unknown" | "failed"; reprint: boolean; actorId: string; reason?: string; at: number };

function id(prefix: string) { return `${prefix}_${randomBytes(12).toString("hex")}`; }
function opaque() { return `kp1.${randomBytes(24).toString("base64url")}`; }
function pdf(title: string, lines: string[], width = 612, height = 792) { const text = [title, ...lines].map((line) => line.replace(/[()\\]/g, "")).join("\\n"); const stream = `BT /F1 10 Tf 36 ${height - 40} Td (${text.replace(/\\n/g, ") Tj 0 -14 Td (")}) Tj ET`; return `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${width} ${height}]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length ${Buffer.byteLength(stream, "utf8")}>>stream\n${stream}\nendstream\nendobj\ntrailer<</Root 1 0 R>>\n%%EOF`; }

export function createSaleStore(calendar: CalendarStore, database?: LocalDatabase, inventory?: InventoryStore) {
  const sales = new Map<string, SaleRecord>();
  const idempotency = new Map<string, SaleRecord>();
  const printAttempts: PrintAttempt[] = [];
  let receiptSequence = 0;
  if (database) {
    const row = database.orm.all<{ sales: string; attempts: string; sequence: number }>(sql`SELECT sales_json AS sales, print_attempts_json AS attempts, receipt_sequence AS sequence FROM sales_state WHERE id = 1`)[0];
    if (row) { for (const sale of JSON.parse(row.sales) as SaleRecord[]) { sales.set(sale.id, sale); idempotency.set(sale.idempotencyKey, sale); } printAttempts.push(...JSON.parse(row.attempts) as PrintAttempt[]); receiptSequence = row.sequence; }
  }
  const persist = () => { if (!database) return; database.orm.run(sql`UPDATE sales_state SET sales_json = ${JSON.stringify([...sales.values()])}, print_attempts_json = ${JSON.stringify(printAttempts)}, receipt_sequence = ${receiptSequence}, updated_at = ${Date.now()} WHERE id = 1`); };

  function completeSale(input: { idempotencyKey: string; cashierId: string; operatingDate: string; at?: number; lines: SaleLineInput[]; paymentMethod: PaymentMethod; locale?: "id" | "en" }) {
    const existing = idempotency.get(input.idempotencyKey);
    if (existing) return existing;
    if (!input.idempotencyKey || input.lines.length === 0) throw new Error("Sale requires at least one line");
    const at = input.at ?? Date.parse(`${input.operatingDate}T12:00:00Z`);
    const actualDate = calendar.operatingDate(new Date(at));
    if (actualDate !== input.operatingDate) throw new Error("Operating date does not match venue local date");
    const operation = calendar.canOperate(input.operatingDate, calendar.operatingTime(new Date(at)), "sell");
    if (!operation.allowed) throw new Error(operation.reason);
    if (!PAYMENT_METHODS.includes(input.paymentMethod)) throw new Error("Unsupported payment method");
    const ticketLines = input.lines.filter((line): line is TicketLineInput => line.kind !== "product");
    const productLines = input.lines.filter((line): line is ProductLineInput => line.kind === "product");
    const snapshots = ticketLines.map((line) => { if (!line.childId || !line.packageId) throw new Error("Ticket Line requires child and package"); return calendar.snapshot(line.packageId, input.operatingDate); });
    const productSnapshots: ProductSnapshot[] = productLines.map((line) => { if (!inventory) throw new Error("Inventory unavailable"); const item = inventory.products.get(line.productId); if (!item || item.archived) throw new Error("Product unavailable"); if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error("Product quantity must be a positive integer"); const discount = line.discount ?? 0; if (!Number.isInteger(discount) || discount < 0 || discount > item.price * line.quantity) throw new Error("Invalid product discount"); return { productId: item.id, sku: item.sku, name: item.name, unitPrice: item.price, quantity: line.quantity, discount, total: item.price * line.quantity - discount }; });
    if (input.paymentMethod !== "cash" && (ticketLines.some((line) => line.paymentConfirmed !== true) || productLines.some((line) => (line as ProductLineInput & { paymentConfirmed?: boolean }).paymentConfirmed !== true))) throw new Error("External payment requires manual confirmation");
    const total = snapshots.reduce((sum, item) => sum + item.price, 0) + productSnapshots.reduce((sum, item) => sum + item.total, 0);
    const saleId = id("sale");
    inventory?.reserveBatch(productLines.map((line) => ({ productId: line.productId, quantity: line.quantity, actorId: input.cashierId, exception: line.outOfStockException })));
    const tickets = ticketLines.map((line, index) => ({ id: id("ticket"), code: `T-${randomBytes(6).toString("hex").toUpperCase()}`, qrToken: opaque(), childId: line.childId, childName: line.childName, package: snapshots[index]!, status: "waiting" as const }));
    const receiptLines: ReceiptLine[] = tickets.map((ticket) => ({ kind: "ticket", ticketId: ticket.id, childId: ticket.childId, packageName: ticket.package.name, price: ticket.package.price, deposit: ticket.package.deposit }));
    productSnapshots.forEach((snapshot, index) => receiptLines.push({ kind: "product", lineId: `${saleId}_product_${index + 1}`, productId: snapshot.productId, sku: snapshot.sku, productName: snapshot.name, quantity: snapshot.quantity, unitPrice: snapshot.unitPrice, discount: snapshot.discount, total: snapshot.total }));
    const deposits = tickets.map((ticket) => ({ ticketId: ticket.id, amount: ticket.package.deposit, status: "held" as const }));
    const receipt: ReceiptRecord = { id: id("receipt"), number: `R-${String(++receiptSequence).padStart(8, "0")}`, saleId, locale: input.locale ?? "id", lines: receiptLines, total };
    const sale: SaleRecord = { id: saleId, idempotencyKey: input.idempotencyKey, cashierId: input.cashierId, operatingDate: input.operatingDate, paymentMethod: input.paymentMethod, paymentConfirmedAt: Date.now(), status: "completed", tickets, deposits, receipt, lines: receiptLines, total, createdAt: Date.now() };
    sales.set(sale.id, sale); idempotency.set(input.idempotencyKey, sale); persist();
    return sale;
  }
  function complete(input: Parameters<typeof completeSale>[0]) { return database ? database.transaction(() => completeSale(input)) : completeSale(input); }
  function get(idValue: string) { return sales.get(idValue); }
  function recordPrintAttempt(input: { saleId: string; artifact: "tickets" | "receipt"; actorId: string; status: PrintAttempt["status"]; reprint?: boolean; reason?: string }) {
    const sale = sales.get(input.saleId); if (!sale || sale.status !== "completed") throw new Error("Sale unavailable");
    const attempt: PrintAttempt = { id: id("print"), ...input, reprint: input.reprint ?? false, at: Date.now() }; printAttempts.push(attempt); persist(); return attempt;
  }
  async function qr(saleId: string, ticketId: string) { const sale = sales.get(saleId); const ticket = sale?.tickets.find((candidate) => candidate.id === ticketId); if (!sale || !ticket || sale.status !== "completed") throw new Error("Ticket unavailable"); return { contentType: "image/png", filename: `${ticket.code}.png`, body: await QRCode.toBuffer(ticket.qrToken, { type: "png", margin: 1, width: 320 }) }; }
  function artifact(saleId: string, kind: "tickets" | "receipt") {
    const sale = sales.get(saleId); if (!sale || sale.status !== "completed") throw new Error("Sale unavailable");
    if (kind === "receipt") return { contentType: "application/pdf", filename: `${sale.receipt.number}.pdf`, body: pdf("Receipt", [sale.receipt.number, ...sale.receipt.lines.map((line) => line.kind === "ticket" ? `${line.packageName} ${line.childId} IDR ${line.price} deposit IDR ${line.deposit}` : `${line.productName} ${line.sku} x${line.quantity} IDR ${line.total}`), `TOTAL IDR ${sale.total}`], 227, 500) };
    return { contentType: "application/pdf", filename: `${sale.receipt.number}-tickets.pdf`, body: pdf("Tickets", sale.tickets.flatMap((ticket) => [`CHILD: ${ticket.childName ?? ticket.childId}`, `TICKET: ${ticket.code}`, `QR: ${ticket.qrToken}`, `PACKAGE: ${ticket.package.name}`, "--------------------"]), 612, Math.max(792, sale.tickets.length * 120)) };
  }
  return { sales, printAttempts, complete, get, recordPrintAttempt, artifact, qr, persist };
}

export type SaleStore = ReturnType<typeof createSaleStore>;
