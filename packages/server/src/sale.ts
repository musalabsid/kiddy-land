import { randomBytes } from "node:crypto";

import type { CalendarStore, PackageSnapshot } from "./calendar.ts";
import type { LocalDatabase } from "./database.ts";
import type {
  InventoryStore,
  ProductSnapshot as InventoryProductSnapshot,
} from "./inventory.ts";
type ProductSnapshot = InventoryProductSnapshot & {
  membershipDiscount: number;
};
import { sql } from "drizzle-orm";
import QRCode from "qrcode";

import type { MembershipStore } from "./membership.ts";

export const PAYMENT_METHODS = ["cash", "QRIS", "bank-transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type TicketLineInput = {
  kind?: "ticket";
  childId: string;
  childName?: string;
  packageId: string;
  memberId?: string;
  paymentConfirmed?: boolean;
};
export type ProductLineInput = {
  kind: "product";
  productId: string;
  quantity: number;
  discount?: number;
  memberId?: string;
  outOfStockException?: { reason: string; ownerId: string };
};
export type SaleStatus = "completed" | "void";
export type SaleCorrection = {
  id: string;
  kind: "void" | "price-override" | "refund";
  saleId: string;
  lineId?: string;
  originalOperatingDate: string;
  correctionDate: string;
  actorId: string;
  reason: string;
  originalAmount: number;
  correctedAmount: number;
  at: number;
};
export type TicketRecord = {
  id: string;
  code: string;
  dailyNumber: string;
  qrToken: string;
  childId: string;
  childName?: string;
  package: PackageSnapshot;
  status: "waiting";
};
export type ReceiptLine =
  | {
      kind: "ticket";
      ticketId: string;
      childId: string;
      packageName: string;
      price: number;
      originalPrice: number;
      membershipDiscount: number;
      memberId?: string;
      deposit: number;
    }
  | {
      kind: "product";
      lineId: string;
      productId: string;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      membershipDiscount: number;
      memberId?: string;
      total: number;
    };
export type SaleLineInput = TicketLineInput | ProductLineInput;
export type DepositRecord = {
  ticketId: string;
  amount: number;
  status: "held" | "applied" | "refunded" | "forfeited";
  appliedAmount?: number;
  refundedAmount?: number;
};
export type ReceiptRecord = {
  id: string;
  number: string;
  saleId: string;
  locale: "id" | "en";
  lines: ReceiptLine[];
  total: number;
};
export type SaleRecord = {
  id: string;
  idempotencyKey: string;
  cashierId: string;
  operatingDate: string;
  paymentMethod: PaymentMethod;
  paymentConfirmedAt: number;
  status: SaleStatus;
  tickets: TicketRecord[];
  deposits: DepositRecord[];
  receipt: ReceiptRecord;
  lines: ReceiptLine[];
  total: number;
  createdAt: number;
  corrections?: SaleCorrection[];
};
export type PrintAttempt = {
  id: string;
  saleId: string;
  artifact: "tickets" | "receipt";
  status: "requested" | "unknown" | "failed";
  reprint: boolean;
  actorId: string;
  reason?: string;
  at: number;
};

function id(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}
function opaque() {
  return `kp1.${randomBytes(24).toString("base64url")}`;
}
function reasonValid(value: string) {
  return Boolean(value?.trim());
}
function pdfText(value: string) {
  return value.replace(/[()\\]/g, "\\$&");
}
function pdfDocument(
  stream: string,
  width: number,
  height: number,
  image?: { obj: string; data: Buffer },
) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    image
      ? `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> /XObject << /Im0 ${6} 0 R >> >> /Contents 5 0 R >>`
      : `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  if (image)
    objects.push(
      image.obj + `\nstream\n` + image.data.toString("binary") + `\nendstream`,
    );
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "utf8"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return output;
}
function fitPdfText(value: string, max = 38) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
function parseLogoDataUrl(
  url?: string | null,
): { mime: string; buffer: Buffer } | null {
  if (!url || !url.startsWith("data:image/")) return null;
  const comma = url.indexOf(",");
  if (comma === -1) return null;
  const mime = url.slice(5, url.indexOf(";"));
  try {
    return { mime, buffer: Buffer.from(url.slice(comma + 1), "base64") };
  } catch {
    return null;
  }
}
function jpegSize(buf: Buffer): { w: number; h: number } | null {
  // scan for SOF0/SOF2
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7
    ) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}
function pngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function pdfImageFromLogo(
  logo?: string | null,
): { image?: { obj: string; data: Buffer }; w: number; h: number } | null {
  const parsed = parseLogoDataUrl(logo ?? null);
  if (!parsed) return null;
  const { mime, buffer } = parsed;
  if (mime === "image/jpeg" || mime === "image/jpg") {
    const size = jpegSize(buffer) ?? { w: 120, h: 120 };
    const obj = `<< /Type /XObject /Subtype /Image /Width ${size.w} /Height ${size.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buffer.length} >>`;
    return { image: { obj, data: buffer }, w: size.w, h: size.h };
  }
  if (mime === "image/png") {
    const size = pngSize(buffer);
    if (!size) return null;
    // For PNG, we inflate IDAT and create raw RGB - ponytail: simplified fallback to skip image if complex
    // Try raw FlateDecode of PNG bytes directly (may render incorrectly) - fallback to venueName only
    return null;
  }
  return null;
}
function qrPdf(
  rows: Array<{
    code: string;
    dailyNumber: string;
    token: string;
    packageName: string;
  }>,
  venueName: string,
) {
  const W = 595;
  const H = 842;
  const left = 28;
  const right = W - left;
  const top = 22;
  const rowH = 66;
  const cellH = 60;
  const qrUnit = 1.45;
  const quiet = 4;
  let stream = "";
  rows.forEach((row, index) => {
    const cellTop = top + index * rowH;
    const cellW = right - left;
    stream += `0.65 w ${left} ${H - cellTop - cellH} ${cellW} ${cellH} re S\n`;
    const qr = QRCode.create(row.token, { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    const qrPx = (size + quiet * 2) * qrUnit;
    const qrX = left + 9;
    const qrTop = cellTop + (cellH - qrPx) / 2;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (qr.modules.data[r * size + c])
          stream += `${qrX + (c + quiet) * qrUnit} ${H - qrTop - (r + quiet + 1) * qrUnit} ${qrUnit} ${qrUnit} re f\n`;
    const textX = qrX + qrPx + 14;
    const textTop = H - cellTop;
    stream += `BT /F1 7 Tf ${textX} ${textTop - 13} Td (${pdfText(venueName)}) Tj ET\nBT /F1 11 Tf ${textX} ${textTop - 28} Td (${pdfText(fitPdfText(row.packageName))}) Tj ET\nBT /F1 14 Tf ${textX} ${textTop - 44} Td (${pdfText(row.dailyNumber)}) Tj ET\nBT /F1 7 Tf ${textX} ${textTop - 56} Td (${pdfText(row.code)}) Tj ET\n`;
    const cx = right - 37;
    const cy = H - (cellTop + cellH / 2);
    const radius = 11;
    const k = radius * 0.5523;
    stream += `0.55 G 0.8 w ${cx + radius} ${cy} m ${cx + radius} ${cy + k} ${cx + k} ${cy + radius} ${cx} ${cy + radius} c ${cx - k} ${cy + radius} ${cx - radius} ${cy + k} ${cx - radius} ${cy} c ${cx - radius} ${cy - k} ${cx - k} ${cy - radius} ${cx} ${cy - radius} c ${cx + k} ${cy - radius} ${cx + radius} ${cy - k} ${cx + radius} ${cy} c S\n`;
    for (let ray = 0; ray < 8; ray++) {
      const angle = (ray * Math.PI) / 4;
      const dx = Math.cos(angle) * 18;
      const dy = Math.sin(angle) * 18;
      stream += `${cx + dx * 0.45} ${cy + dy * 0.45} m ${cx + dx} ${cy + dy} l S\n`;
    }
    stream += "0 G 1 w\n";
  });
  return pdfDocument(stream, W, H);
}
function receiptMoney(amount: number, locale: "id" | "en") {
  const value = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${locale === "id" ? "Rp" : "IDR"} ${value}`;
}
function receiptPdf(
  sale: SaleRecord,
  venueName: string,
  logoUrl?: string | null,
) {
  const locale = sale.receipt.locale;
  const copy =
    locale === "id"
      ? {
          receipt: "STRUK",
          number: "Nomor",
          date: "Tanggal",
          payment: "Pembayaran",
          discount: "Diskon",
          subtotal: "Subtotal",
          total: "TOTAL",
          deposit: "Deposit ditahan",
          thanks: "Terima kasih sudah berkunjung",
        }
      : {
          receipt: "RECEIPT",
          number: "No.",
          date: "Date",
          payment: "Payment",
          discount: "Discount",
          subtotal: "Subtotal",
          total: "TOTAL",
          deposit: "Deposit held",
          thanks: "Thank you for visiting",
        };
  const payment = {
    cash: locale === "id" ? "Tunai" : "Cash",
    QRIS: "QRIS",
    "bank-transfer": locale === "id" ? "Transfer bank" : "Bank transfer",
  }[sale.paymentMethod];
  const subtotal = sale.receipt.lines.reduce(
    (sum, line) =>
      line.kind === "ticket"
        ? sum + line.originalPrice
        : sum + line.unitPrice * line.quantity,
    0,
  );
  const deposit = sale.receipt.lines.reduce(
    (sum, line) => sum + (line.kind === "ticket" ? line.deposit : 0),
    0,
  );
  const discount = Math.max(0, subtotal - (sale.total - deposit));
  // group same ticket packages for compact receipt (same package, price, deposit, member)
  const grouped: typeof sale.receipt.lines = [];
  const ticketGroups = new Map<string, any>();
  for (const line of sale.receipt.lines) {
    if (line.kind === "product") {
      grouped.push(line);
    } else {
      const key = `${line.packageName}|${line.originalPrice}|${line.price}|${line.deposit}|${line.memberId ?? ""}`;
      const existing = ticketGroups.get(key);
      if (existing) {
        existing._count += 1;
        existing.price += line.price;
        existing.originalPrice += line.originalPrice;
        existing.deposit += line.deposit;
        existing.membershipDiscount += line.membershipDiscount;
      } else {
        ticketGroups.set(key, { ...line, _count: 1 });
      }
    }
  }
  for (const g of ticketGroups.values()) grouped.push(g);
  const displayLines: any[] = grouped;
  const itemHeight = displayLines.reduce(
    (sum, line) =>
      sum +
      (line.kind === "ticket"
        ? 29 + (line.membershipDiscount ? 10 : 0) + (line.deposit ? 10 : 0)
        : 29 + (line.discount ? 10 : 0)),
    0,
  );
  const W = 227;
  const H = 112 + itemHeight + (discount ? 24 : 12) + (deposit ? 16 : 0) + 30;
  const padding = 16;
  const right = W - padding;
  let top = 18;
  let stream = "";
  const width = (value: string, size: number) => value.length * size * 0.52;
  const text = (value: string, size: number, x = padding) => {
    stream += `BT /F1 ${size} Tf ${x} ${H - top - size} Td (${pdfText(value)}) Tj ET\n`;
  };
  const centered = (value: string, size: number) =>
    text(value, size, Math.max(padding, (W - width(value, size)) / 2));
  const amount = (value: number) => receiptMoney(value, locale);
  const rightText = (value: string, size: number) =>
    text(value, size, Math.max(padding, right - width(value, size)));
  const rule = () => {
    stream += `${padding} ${H - top} m ${right} ${H - top} l S\n`;
    top += 8;
  };

  const logo = pdfImageFromLogo(logoUrl ?? null);
  if (logo?.image) {
    // draw logo centered above venueName - simple 32x32 box
    const imgW = 28,
      imgH = 28;
    const imgX = (W - imgW) / 2;
    stream += `q ${imgW} 0 0 ${imgH} ${imgX} ${H - top - imgH} cm /Im0 Do Q\n`;
    top += imgH + 6;
  }
  centered(venueName, 16);
  top += 22; // logo only receipt/report
  centered(copy.receipt, 9);
  top += 16;
  text(`${copy.number}: ${sale.receipt.number}`, 8);
  top += 11;
  text(`${copy.date}: ${sale.operatingDate}`, 8);
  top += 11;
  text(`${copy.payment}: ${payment}`, 8);
  top += 12;
  rule();
  displayLines.forEach((line) => {
    const count =
      (line as any)._count ?? (line.kind === "product" ? line.quantity : 1);
    const name =
      line.kind === "ticket"
        ? fitPdfText(
            count > 1 ? `${line.packageName} × ${count}` : line.packageName,
            24,
          )
        : fitPdfText(line.productName, 24);
    const lineTotal = line.kind === "ticket" ? line.price : line.total;
    text(name, 9);
    rightText(amount(lineTotal), 9);
    top += 12;
    if (line.kind === "ticket") {
      const unit = line.originalPrice / count;
      text(
        count > 1
          ? `${count} x ${amount(unit)}`
          : `1 x ${amount(line.originalPrice)}`,
        7.5,
      );
      top += 10;
      if (line.membershipDiscount) {
        text(`${copy.discount}: -${amount(line.membershipDiscount)}`, 7.5);
        top += 10;
      }
      if (line.deposit) {
        text(`${copy.deposit}: ${amount(line.deposit)}`, 7.5);
        top += 10;
      }
    } else {
      text(`${line.quantity} x ${amount(line.unitPrice)}`, 7.5);
      top += 10;
      if (line.discount) {
        text(`${copy.discount}: -${amount(line.discount)}`, 7.5);
        top += 10;
      }
    }
    top += 5;
  });
  rule();
  text(copy.subtotal, 8);
  rightText(amount(subtotal), 8);
  top += 12;
  if (discount) {
    text(copy.discount, 8);
    rightText(`-${amount(discount)}`, 8);
    top += 12;
  }
  text(copy.total, 11);
  rightText(amount(sale.total), 11);
  top += 16;
  if (deposit) {
    text(copy.deposit, 7.5);
    rightText(amount(deposit), 7.5);
    top += 12;
  }
  rule();
  centered(copy.thanks, 8);
  return pdfDocument(stream, W, H, logo?.image);
}
export function createSaleStore(
  calendar: CalendarStore,
  database?: LocalDatabase,
  inventory?: InventoryStore,
  membership?: MembershipStore,
) {
  const sales = new Map<string, SaleRecord>();
  const idempotency = new Map<string, SaleRecord>();
  const printAttempts: PrintAttempt[] = [];
  let receiptSequence = 0;
  const dailySeq = new Map<string, number>();
  const loadDailySeq = () => {
    if (!database) return;
    try {
      const rows = database.orm.all<{ operating_date: string; seq: number }>(
        sql`SELECT operating_date, seq FROM ticket_daily_seq`,
      );
      for (const r of rows) dailySeq.set(r.operating_date, r.seq);
      // backfill from existing sales if empty (preserve max per day)
      if (rows.length === 0) {
        for (const sale of sales.values()) {
          for (const t of sale.tickets) {
            const n = Number((t as any).dailyNumber);
            if (!Number.isNaN(n)) {
              const cur = dailySeq.get(sale.operatingDate) ?? 0;
              if (n > cur) dailySeq.set(sale.operatingDate, n);
            }
          }
        }
      }
    } catch {}
  };
  if (database) {
    const row = database.orm.all<{
      sales: string;
      attempts: string;
      sequence: number;
    }>(
      sql`SELECT sales_json AS sales, print_attempts_json AS attempts, receipt_sequence AS sequence FROM sales_state WHERE id = 1`,
    )[0];
    if (row) {
      for (const sale of JSON.parse(row.sales) as SaleRecord[]) {
        sales.set(sale.id, sale);
        idempotency.set(sale.idempotencyKey, sale);
      }
      printAttempts.push(...(JSON.parse(row.attempts) as PrintAttempt[]));
      receiptSequence = row.sequence;
    }
    loadDailySeq();
  }
  const nextDailyNumbers = (operatingDate: string, count: number): string[] => {
    const start = (dailySeq.get(operatingDate) ?? 0) + 1;
    const result: string[] = [];
    for (let i = 0; i < count; i++)
      result.push(String(start + i).padStart(4, "0"));
    dailySeq.set(operatingDate, start + count - 1);
    if (database) {
      try {
        database.orm.run(
          sql`INSERT INTO ticket_daily_seq(operating_date, seq) VALUES (${operatingDate}, ${start + count - 1}) ON CONFLICT(operating_date) DO UPDATE SET seq = excluded.seq`,
        );
      } catch {}
    }
    return result;
  };
  const persist = () => {
    if (!database) return;
    database.orm.run(
      sql`UPDATE sales_state SET sales_json = ${JSON.stringify([...sales.values()])}, print_attempts_json = ${JSON.stringify(printAttempts)}, receipt_sequence = ${receiptSequence}, updated_at = ${Date.now()} WHERE id = 1`,
    );
  };

  function completeSale(input: {
    idempotencyKey: string;
    cashierId: string;
    operatingDate: string;
    at?: number;
    lines: SaleLineInput[];
    paymentMethod: PaymentMethod;
    locale?: "id" | "en";
  }) {
    const existing = idempotency.get(input.idempotencyKey);
    if (existing) return existing;
    if (!input.idempotencyKey || input.lines.length === 0)
      throw new Error("Sale requires at least one line");
    const at = input.at ?? Date.parse(`${input.operatingDate}T12:00:00Z`);
    const actualDate = calendar.operatingDate(new Date(at));
    if (actualDate !== input.operatingDate)
      throw new Error("Operating date does not match venue local date");
    const operation = calendar.canOperate(
      input.operatingDate,
      calendar.operatingTime(new Date(at)),
      "sell",
    );
    if (!operation.allowed) throw new Error(operation.reason);
    if (!PAYMENT_METHODS.includes(input.paymentMethod))
      throw new Error("Unsupported payment method");
    const ticketLines = input.lines.filter(
      (line): line is TicketLineInput => line.kind !== "product",
    );
    const productLines = input.lines.filter(
      (line): line is ProductLineInput => line.kind === "product",
    );
    if (ticketLines.length > 12)
      throw new Error("A sale cannot contain more than 12 tickets");
    const snapshots = ticketLines.map((line) => {
      if (!line.childId || !line.packageId)
        throw new Error("Ticket Line requires child and package");
      return calendar.snapshot(line.packageId, input.operatingDate);
    });
    const memberFor = (memberId?: string) =>
      memberId
        ? (membership?.find(memberId) ??
          (() => {
            throw new Error("Member unavailable");
          })())
        : undefined;
    const ticketDiscounts = ticketLines.map((line, index) => {
      const found = memberFor(line.memberId);
      if (found && found.member.childId !== line.childId)
        throw new Error("Member does not belong to child");
      return line.memberId
        ? Math.min(
            membership!.discount(
              line.memberId,
              "ticketPackages",
              line.packageId,
            ),
            snapshots[index]!.price,
          )
        : 0;
    });
    const productSnapshots: ProductSnapshot[] = productLines.map((line) => {
      if (!inventory) throw new Error("Inventory unavailable");
      const item = inventory.products.get(line.productId);
      if (!item || item.archived) throw new Error("Product unavailable");
      if (
        !Number.isInteger(line.quantity) ||
        line.quantity <= 0 ||
        line.quantity > 24
      )
        throw new Error("Product quantity must be an integer from 1 to 24");
      const configured =
        line.memberId && membership
          ? membership.discount(line.memberId, "products", line.productId)
          : 0;
      const discount = line.discount ?? 0;
      if (configured && discount)
        throw new Error("Membership discount cannot stack");
      const membershipDiscount = Math.min(
        configured,
        item.price * line.quantity,
      );
      if (
        !Number.isInteger(discount) ||
        discount < 0 ||
        discount > item.price * line.quantity
      )
        throw new Error("Invalid product discount");
      return {
        productId: item.id,
        sku: item.sku,
        name: item.name,
        unitPrice: item.price,
        quantity: line.quantity,
        discount: discount + membershipDiscount,
        membershipDiscount,
        total: item.price * line.quantity - discount - membershipDiscount,
      };
    });
    if (
      input.paymentMethod !== "cash" &&
      (ticketLines.some((line) => line.paymentConfirmed !== true) ||
        productLines.some(
          (line) =>
            (line as ProductLineInput & { paymentConfirmed?: boolean })
              .paymentConfirmed !== true,
        ))
    )
      throw new Error("External payment requires manual confirmation");
    const depositTotal = snapshots.reduce((sum, item) => sum + item.deposit, 0);
    const total =
      snapshots.reduce(
        (sum, item, index) => sum + item.price - ticketDiscounts[index]!,
        0,
      ) +
      productSnapshots.reduce((sum, item) => sum + item.total, 0) +
      depositTotal;
    const saleId = id("sale");
    inventory?.reserveBatch(
      productLines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        actorId: input.cashierId,
        exception: line.outOfStockException,
      })),
    );
    // daily sequential 0001 per operatingDate, persisted via DB or in-memory
    const tickets = (() => {
      const base = ticketLines.map((line, index) => ({
        id: id("ticket"),
        code: `T-${randomBytes(6).toString("hex").toUpperCase()}`,
        qrToken: opaque(),
        childId: line.childId,
        childName: line.childName,
        package: snapshots[index]!,
        status: "waiting" as const,
      }));
      // attach dailyNumber
      const dailyNumbers = nextDailyNumbers(
        input.operatingDate,
        ticketLines.length,
      );
      return base.map((t, i) => ({ ...t, dailyNumber: dailyNumbers[i]! }));
    })();
    const receiptLines: ReceiptLine[] = tickets.map((ticket, index) => ({
      kind: "ticket",
      ticketId: ticket.id,
      childId: ticket.childId,
      packageName: ticket.package.name,
      price: ticket.package.price - ticketDiscounts[index]!,
      originalPrice: ticket.package.price,
      membershipDiscount: ticketDiscounts[index]!,
      memberId: ticketLines[index]!.memberId,
      deposit: ticket.package.deposit,
    }));
    productSnapshots.forEach((snapshot, index) =>
      receiptLines.push({
        kind: "product",
        lineId: `${saleId}_product_${index + 1}`,
        productId: snapshot.productId,
        sku: snapshot.sku,
        productName: snapshot.name,
        quantity: snapshot.quantity,
        unitPrice: snapshot.unitPrice,
        discount: snapshot.discount,
        membershipDiscount: snapshot.membershipDiscount,
        memberId: productLines[index]!.memberId,
        total: snapshot.total,
      }),
    );
    const deposits: DepositRecord[] = tickets.map((ticket) => ({
      ticketId: ticket.id,
      amount: ticket.package.deposit,
      status: "held" as const,
    }));
    const receipt: ReceiptRecord = {
      id: id("receipt"),
      number: `R-${String(++receiptSequence).padStart(8, "0")}`,
      saleId,
      locale: input.locale ?? "id",
      lines: receiptLines,
      total,
    };
    const sale: SaleRecord = {
      id: saleId,
      idempotencyKey: input.idempotencyKey,
      cashierId: input.cashierId,
      operatingDate: input.operatingDate,
      paymentMethod: input.paymentMethod,
      paymentConfirmedAt: Date.now(),
      status: "completed",
      tickets,
      deposits,
      receipt,
      lines: receiptLines,
      total,
      createdAt: Date.now(),
      corrections: [],
    };
    sales.set(sale.id, sale);
    idempotency.set(input.idempotencyKey, sale);
    persist();
    if (membership) {
      ticketLines.forEach((line, index) => {
        if (line.memberId && ticketDiscounts[index]! > 0)
          membership.event({
            type: "discount-applied",
            memberId: line.memberId,
            childId: line.childId,
            saleId,
            lineId: tickets[index]!.id,
            amount: ticketDiscounts[index],
            actorId: input.cashierId,
          });
      });
      productLines.forEach((line, index) => {
        const amount = productSnapshots[index]!.membershipDiscount;
        if (line.memberId && amount > 0)
          membership.event({
            type: "discount-applied",
            memberId: line.memberId,
            childId: membership.find(line.memberId)!.child.id,
            saleId,
            lineId: `${saleId}_product_${index + 1}`,
            amount,
            actorId: input.cashierId,
          });
      });
      membership.persist();
    }
    return sale;
  }
  function complete(input: Parameters<typeof completeSale>[0]) {
    return database
      ? database.transaction(() => completeSale(input))
      : completeSale(input);
  }
  function list(filter?: { operatingDate?: string; limit?: number }) {
    let result = [...sales.values()];
    if (filter?.operatingDate)
      result = result.filter(
        (sale) => sale.operatingDate === filter.operatingDate,
      );
    result.sort((a, b) => b.createdAt - a.createdAt);
    if (filter?.limit) result = result.slice(0, filter.limit);
    return result;
  }
  function get(idValue: string) {
    return sales.get(idValue);
  }
  function voidSale(
    saleId: string,
    actorId: string,
    reason: string,
    at = Date.now(),
  ) {
    const sale = sales.get(saleId);
    if (!sale || sale.status !== "completed" || !reason.trim())
      throw new Error("Sale cannot be voided");
    const correction: SaleCorrection = {
      id: id("correction"),
      kind: "void",
      saleId,
      originalOperatingDate: sale.operatingDate,
      correctionDate: calendar.operatingDate(new Date(at)),
      actorId,
      reason,
      originalAmount: sale.total,
      correctedAmount: 0,
      at,
    };
    sale.status = "void";
    sale.deposits.forEach((deposit) => {
      if (deposit.status === "held") {
        deposit.status = "refunded";
        deposit.refundedAmount = deposit.amount;
      }
    });
    sale.corrections ??= [];
    sale.corrections.push(correction);
    persist();
    return correction;
  }
  function addCorrection(input: {
    saleId: string;
    lineId?: string;
    kind: "price-override" | "refund";
    correctedAmount: number;
    actorId: string;
    reason: string;
    at?: number;
  }) {
    const sale = sales.get(input.saleId);
    if (
      !sale ||
      sale.status !== "completed" ||
      !reasonValid(input.reason) ||
      !Number.isInteger(input.correctedAmount) ||
      input.correctedAmount < 0
    )
      throw new Error("Invalid correction");
    if (!input.lineId) throw new Error("Correction line is required");
    const line = sale.lines.find(
      (item) =>
        (item.kind === "product" ? item.lineId : item.ticketId) ===
        input.lineId,
    );
    if (!line) throw new Error("Correction line not found");
    const originalAmount = line.kind === "product" ? line.total : line.price;
    const prior = (sale.corrections ?? []).filter(
      (item) => item.lineId === input.lineId,
    );
    if (prior.length || input.correctedAmount > originalAmount)
      throw new Error("Correction exceeds original line");
    const at = input.at ?? Date.now();
    const correction: SaleCorrection = {
      id: id("correction"),
      ...input,
      saleId: sale.id,
      originalOperatingDate: sale.operatingDate,
      correctionDate: calendar.operatingDate(new Date(at)),
      originalAmount,
      at,
    };
    sale.corrections ??= [];
    sale.corrections.push(correction);
    persist();
    return correction;
  }
  function recordPrintAttempt(input: {
    saleId: string;
    artifact: "tickets" | "receipt";
    actorId: string;
    status: PrintAttempt["status"];
    reprint?: boolean;
    reason?: string;
  }) {
    const sale = sales.get(input.saleId);
    if (!sale || sale.status !== "completed")
      throw new Error("Sale unavailable");
    const attempt: PrintAttempt = {
      id: id("print"),
      ...input,
      reprint: input.reprint ?? false,
      at: Date.now(),
    };
    printAttempts.push(attempt);
    persist();
    return attempt;
  }
  async function qr(saleId: string, ticketId: string) {
    const sale = sales.get(saleId);
    const ticket = sale?.tickets.find((candidate) => candidate.id === ticketId);
    if (!sale || !ticket || sale.status !== "completed")
      throw new Error("Ticket unavailable");
    return {
      contentType: "image/png",
      filename: `${ticket.code}.png`,
      body: await QRCode.toBuffer(ticket.qrToken, {
        type: "png",
        margin: 1,
        width: 320,
      }),
    };
  }
  const getVenue = (): { name: string; logo: string | null } => {
    try {
      if (!database) return { name: "Kiddy Land", logo: null };
      const row = database.db
        .query("SELECT state_json AS state FROM venue_settings WHERE id = 1")
        .get() as { state: string } | undefined;
      if (!row) return { name: "Kiddy Land", logo: null };
      const st = JSON.parse(row.state) as {
        venueName?: string;
        logoUrl?: string | null;
      };
      return { name: st.venueName || "Kiddy Land", logo: st.logoUrl ?? null };
    } catch {
      return { name: "Kiddy Land", logo: null };
    }
  };
  function artifact(saleId: string, kind: "tickets" | "receipt") {
    const sale = sales.get(saleId);
    if (!sale || sale.status !== "completed")
      throw new Error("Sale unavailable");
    const venue = getVenue();
    if (kind === "receipt")
      return {
        contentType: "application/pdf",
        filename: `${sale.receipt.number}.pdf`,
        body: receiptPdf(sale, venue.name),
      };
    return {
      contentType: "application/pdf",
      filename: `${sale.receipt.number}-tickets.pdf`,
      body: qrPdf(
        sale.tickets.map((ticket) => ({
          code: ticket.code,
          dailyNumber: (ticket as any).dailyNumber ?? ticket.code,
          token: ticket.qrToken,
          packageName: ticket.package.name,
        })),
        venue.name,
      ),
    };
  }
  return {
    sales,
    printAttempts,
    complete,
    list,
    get,
    voidSale,
    addCorrection,
    recordPrintAttempt,
    artifact,
    qr,
    persist,
  };
}

export type SaleStore = ReturnType<typeof createSaleStore>;
