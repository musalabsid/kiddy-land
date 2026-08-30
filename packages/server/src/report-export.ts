function escape(value: unknown) { if (value == null) return ""; const text = typeof value === "string" ? value : JSON.stringify(value); return `"${text.replace(/"/g, '""')}"`; }
function money(value: number | undefined) { if (value == null || Number.isNaN(value as number)) return "-"; return `Rp ${Number(value).toLocaleString("id-ID")}`; }
function shortId(value: string | undefined) { if (!value) return "-"; const v = String(value); return v.length > 12 ? v.slice(0, 4) + "..." + v.slice(-4) : v; }
function pdfText(value: unknown) { const s = value == null ? "" : String(value); return s.replace(/[()\\]/g, "\\$&"); }
function pdfDocument(stream: string, width: number, height: number, image?: { obj: string; data: Buffer }) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    image ? `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im0 ${6} 0 R >> >> /Contents 5 0 R >>` : `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  if (image) objects.push(image.obj + `\nstream\n` + image.data.toString("binary") + `\nendstream`); // ponytail: logo only receipt/report
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index + 1} 0 obj${object}endobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function reportCsv(report: { kind: string; filters: unknown; timezone: string; generatedAt: string; data: unknown }) {
  const f = report.filters as { from: string; to: string };
  const header = [["report", report.kind], ["period", `${f.from} to ${f.to}`], ["timezone", report.timezone], ["generatedAt", report.generatedAt]];
  const data = report.data as any;
  if (report.kind === "financial" && data.rows && Array.isArray(data.rows) && (data.rows[0] as any)?.saleId) {
    const rows: string[][] = [["saleId", "operatingDate", "cashierId", "paymentMethod", "ticketRevenue", "productRevenue", "total", "depositReceived", "status"]];
    for (const row of data.rows as Array<{ saleId: string; operatingDate: string; cashierId: string; paymentMethod: string; ticketRevenue: number; productRevenue: number; total: number; depositReceived: number; status: string }>) {
      rows.push([row.saleId ?? "", row.operatingDate ?? "", row.cashierId ?? "", row.paymentMethod ?? "", String(row.ticketRevenue ?? ""), String(row.productRevenue ?? ""), String(row.total ?? ""), String(row.depositReceived ?? ""), row.status ?? ""]);
    }
    rows.push([]);
    rows.push(["totals", ""]);
    const t = data.totals as any;
    rows.push(["ticketRevenue", String(t.ticketRevenue)]);
    rows.push(["productRevenue", String(t.productRevenue)]);
    rows.push(["overtimeRevenue", String(t.overtimeRevenue)]);
    rows.push(["grossRevenue", String(t.grossRevenue)]);
    rows.push(["netRevenue", String(t.netRevenue)]);
    rows.push(["depositsReceived", String(t.depositsReceived)]);
    rows.push(["refunds", String(t.refunds)]);
    rows.push(["voids", String(t.voids)]);
    return [...header.map((r) => r.map(escape).join(",")), ...rows.map((r) => r.map(escape).join(","))].join("\r\n") + "\r\n";
  }
  if (report.kind === "inventory" && data.products) {
    const rows: string[][] = [["sku", "name", "stock", "price", "lowStockThreshold", "archived"]];
    for (const p of data.products as Array<{ sku: string; name: string; stock: number; price: number; lowStockThreshold: number; archived: boolean }>) {
      rows.push([p.sku, p.name, String(p.stock), String(p.price), String(p.lowStockThreshold), String(p.archived)]);
    }
    return [...header.map((r) => r.map(escape).join(",")), ...rows.map((r) => r.map(escape).join(","))].join("\r\n") + "\r\n";
  }
  const rows = (data as { rows?: unknown[] }).rows ?? [data];
  return [...header.map((r) => r.map(escape).join(",")), ["data", "value"], ...rows.map((row) => ["row", JSON.stringify(row)]).map((r) => r.map(escape).join(","))].join("\r\n") + "\r\n";
}

export function reportPdf(report: { kind: string; filters: unknown; timezone: string; generatedAt: string; data: unknown }, venueName = "Kiddy Land", logoUrl?: string | null) {
  const pdfImageFromLogo = (url?: string | null) => {
    if (!url || !url.startsWith("data:image/")) return null;
    const comma = url.indexOf(",");
    const mime = url.slice(5, url.indexOf(";"));
    try {
      const buf = Buffer.from(url.slice(comma + 1), "base64");
      if (mime === "image/jpeg" || mime === "image/jpg") {
        let i=2; let w=120,h=120;
        while(i < buf.length-9){ if(buf[i]!==0xff) break; const m=buf[i+1]; const len=buf.readUInt16BE(i+2); if((m>=0xc0&&m<=0xc3)||m===0xc5||m===0xc6||m===0xc7){h=buf.readUInt16BE(i+5);w=buf.readUInt16BE(i+7);break;} i+=2+len; }
        const obj=`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buf.length} >>`;
        return { image:{obj, data:buf}, w, h };
      }
    } catch {}
    return null;
  };
  const logo = pdfImageFromLogo(logoUrl ?? null);
  const f = report.filters as { from: string; to: string };
  const W = 842; // A4 landscape
  const H = 595;
  const margin = 36;
  const right = W - margin;
  let y = H - 38;
  let stream = "";
  const font = (name: "F1" | "F2", size: number, x: number, yPos: number, txt: string) => {
    const safe = pdfText(txt).slice(0, 130);
    stream += `BT /${name} ${size} Tf ${x} ${yPos} Td (${safe}) Tj ET\n`;
  };
  const text = (value: unknown, size: number, x = margin, yPos = y, fName: "F1" | "F2" = "F1") => {
    const safe = pdfText(value == null ? "" : String(value)).slice(0, 130);
    stream += `BT /${fName} ${size} Tf ${x} ${yPos} Td (${safe}) Tj ET\n`;
  };
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.7) => {
    stream += `${w} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  };
  const rectFill = (x: number, yy: number, w: number, h: number, gray = 0.95) => {
    stream += `${gray} g ${x} ${yy} ${w} ${h} re f 0 g\n`;
  };
  // Header
  if (logo?.image) { stream += `q 18 0 0 18 ${margin} ${y - 8} cm /Im0 Do Q\n`; text(venueName, 9, margin + 22, y, "F1"); } else { text(venueName, 9, margin, y, "F1"); }
  stream += `0.55 g\n`;
  text("FINANCIAL REPORT", 7, right - 95, y, "F1");
  stream += `0 g\n`;
  y -= 16;
  font("F2", 18, margin, y, report.kind.charAt(0).toUpperCase() + report.kind.slice(1) + " Report");
  y -= 20;
  line(margin, y + 12, right, y + 12, 1);
  y -= 2;
  text(`Period  ${f.from} - ${f.to}`, 8, margin, y, "F1");
  y -= 12;
  text(`Timezone  ${report.timezone}  |  Generated  ${new Date(report.generatedAt).toLocaleString("id-ID", { timeZone: report.timezone, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 7, margin, y, "F1");
  y -= 18;
  const data = report.data as any;
  if (report.kind === "financial" && data.rows && data.totals && Array.isArray(data.rows) && (data.rows[0] as any)?.saleId) {
    // Summary card
    const t = data.totals as any;
    const cardY = y;
    const cardH = 92;
    // card border
    stream += `0.88 g\n`;
    rectFill(margin, cardY - cardH + 14, right - margin, cardH, 0.96);
    stream += `0 g\n`;
    stream += `0.82 g\n`;
    line(margin, cardY + 6, right, cardY + 6, 0.6);
    stream += `0 g\n`;
    text("Summary", 9, margin + 8, cardY, "F2");
    y = cardY - 14;
    const rows: Array<[string, string, boolean?]> = [
      ["Ticket revenue", money(t.ticketRevenue), false],
      ["Product revenue", money(t.productRevenue), false],
      ["Overtime", money(t.overtimeRevenue), false],
      ["Gross", money(t.grossRevenue), true],
      ["Net", money(t.netRevenue), true],
      ["Deposits", money(t.depositsReceived), false],
      ["Voids", String(t.voids), false],
    ];
    const col1X = margin + 8;
    const col1W = 160;
    const col2X = margin + 170;
    const col3X = right - 110;
    y -= 2;
    // Use two columns for summary to save space
    for (let i = 0; i < rows.length; i++) {
      const isRightCol = i >= 4;
      const idx = isRightCol ? i - 4 : i;
      const baseY = cardY - 14 - idx * 13;
      if (isRightCol) {
        // right column
        const [k, v] = rows[i]!;
        text(k, 7, col3X - 70, baseY, "F1");
        const vx = right - 8 - (v.length * 5.2);
        text(v, 7, Math.max(col3X + 20, vx), baseY, rows[i]![2] ? "F2" : "F1");
      } else {
        const [k, v] = rows[i]!;
        text(k, 7, col1X, baseY, "F1");
        const vx = col1X + col1W - v.length * 5.2;
        text(v, 7, Math.max(col1X + 30, vx), baseY, rows[i]![2] ? "F2" : "F1");
      }
    }
    y = cardY - cardH - 8;
    if (data.rows.length === 0) {
      text("No sales in this period", 9, margin, y, "F1");
      y -= 20;
    } else {
      text("Sales", 9, margin, y, "F2");
      y -= 14;
      // table header background
      rectFill(margin, y - 4, right - margin, 14, 0.94);
      const cols = [
        { label: "Date", x: margin + 4, w: 78 },
        { label: "Sale", x: margin + 84, w: 96 },
        { label: "Cashier", x: margin + 182, w: 92 },
        { label: "Payment", x: margin + 276, w: 72 },
        { label: "Ticket", x: margin + 350, w: 84, align: "right" as const },
        { label: "Product", x: margin + 436, w: 84, align: "right" as const },
        { label: "Total", x: margin + 522, w: 84, align: "right" as const },
        { label: "Status", x: margin + 608, w: 50 },
      ];
      for (const c of cols) text(c.label.toUpperCase(), 6, c.x, y, "F2");
      y -= 10;
      line(margin, y + 6, right, y + 6, 0.5);
      y -= 6;
      for (const row of data.rows as Array<{ saleId: string; operatingDate: string; cashierId: string; paymentMethod: string; ticketRevenue: number; productRevenue: number; total: number; status: string }>) {
        if (y < 52) break;
        text(row.operatingDate, 7, cols[0]!.x, y, "F1");
        text(shortId(row.saleId), 7, cols[1]!.x, y, "F1");
        const cashier = (row.cashierId || "").replace("user_", "").slice(0, 10);
        text(cashier, 7, cols[2]!.x, y, "F1");
        text(row.paymentMethod, 7, cols[3]!.x, y, "F1");
        const ticket = money(row.ticketRevenue);
        const product = money(row.productRevenue);
        const total = money(row.total);
        const ticketX = cols[4]!.x + cols[4]!.w - ticket.length * 4.2;
        const productX = cols[5]!.x + cols[5]!.w - product.length * 4.2;
        const totalX = cols[6]!.x + cols[6]!.w - total.length * 4.2;
        text(ticket, 7, Math.max(cols[4]!.x, ticketX), y, "F1");
        text(product, 7, Math.max(cols[5]!.x, productX), y, "F1");
        text(total, 7, Math.max(cols[6]!.x, totalX), y, "F2");
        text(row.status, 6, cols[7]!.x, y, "F1");
        y -= 12;
        // hairline
        stream += `0.88 g\n`;
        line(margin, y + 7, right, y + 7, 0.4);
        stream += `0 g\n`;
      }
      y -= 4;
    }
    // footer
    text("Kiddy Land | Confidential | " + new Date().getFullYear(), 6, margin, 28, "F1");
    text(`Page 1 of 1 | ${data.rows.length} sales`, 6, right - 110, 28, "F1");
  } else if (report.kind === "inventory" && data.products) {
    text("Inventory", 10, margin, y, "F2");
    y -= 14;
    rectFill(margin, y - 4, right - margin, 14, 0.94);
    const headers = ["SKU", "Name", "Stock", "Price"];
    const xs = [margin + 4, margin + 90, margin + 310, margin + 400];
    for (let i = 0; i < headers.length; i++) text(headers[i]!, 6, xs[i]!, y, "F2");
    y -= 10;
    line(margin, y + 6, right, y + 6, 0.5);
    y -= 6;
    for (const p of (data.products as Array<{ sku: string; name: string; stock: number; price: number }>).slice(0, 42)) {
      if (y < 52) break;
      text(p.sku.slice(0, 16), 7, xs[0]!, y, "F1");
      text(p.name.slice(0, 36), 7, xs[1]!, y, "F1");
      text(String(p.stock), 7, xs[2]!, y, "F1");
      text(money(p.price), 7, xs[3]!, y, "F1");
      y -= 12;
      stream += `0.92 g\n`;
      line(margin, y + 7, right, y + 7, 0.3);
      stream += `0 g\n`;
    }
    text("Kiddy Land | Confidential", 6, margin, 28, "F1");
  } else {
    text(`${report.kind} report`, 10, margin, y, "F2");
    y -= 12;
    const json = JSON.stringify(data, null, 2).split("\n");
    for (const lineText of json.slice(0, 48)) {
      if (y < 52) break;
      text(lineText.slice(0, 100), 6, margin, y, "F1");
      y -= 9;
    }
    text("Kiddy Land | Confidential", 6, margin, 28, "F1");
  }
  return pdfDocument(stream, W, H);
}
