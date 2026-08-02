import * as React from "react";
import { useProductRefund } from "@kiddy-land/client/react";
type SaleLine = { kind: "ticket"; ticketId: string; childId: string; packageName: string; price: number; deposit: number } | { kind: "product"; lineId: string; productId: string; sku: string; productName: string; quantity: number; unitPrice: number; discount: number; total: number };
type SaleRecord = { id: string; receipt: { lines: SaleLine[] } };
import { Button } from "@workspace/ui/components/button";
import { useLocale } from "@workspace/ui/lib/i18n";

export function SaleRefund({ sale }: { sale: SaleRecord }) {
  const { t } = useLocale(); const refund = useProductRefund(); const [reason, setReason] = React.useState(""); const [disposition, setDisposition] = React.useState<"return-to-stock" | "damaged-consumed">("return-to-stock");
  const lines = sale.receipt.lines.filter((line) => line.kind === "product");
  return <div className="grid gap-2">{lines.map((line) => line.kind === "product" ? <div className="flex flex-wrap items-center gap-2 border p-2" key={line.lineId}><span>{line.productName} × {line.quantity}</span><input className="h-9 border px-2" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} /><select className="h-9 border px-2" value={disposition} onChange={(e) => setDisposition(e.target.value as typeof disposition)}><option value="return-to-stock">Return to stock</option><option value="damaged-consumed">Damaged/consumed</option></select><Button size="sm" onClick={() => refund.mutate({ saleId: sale.id, idempotencyKey: crypto.randomUUID(), lineId: line.lineId, quantity: 1, disposition, reason })} disabled={!reason.trim() || refund.isPending}>{t("inventory.refund")}</Button></div> : null)}</div>;
}
