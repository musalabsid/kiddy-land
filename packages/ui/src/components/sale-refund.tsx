import { zodResolver } from "@hookform/resolvers/zod";
import { useProductRefund } from "@kiddy-land/client/react";
import { Select } from "@workspace/ui/components/select";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
type SaleLine =
  | {
      kind: "ticket";
      ticketId: string;
      childId: string;
      packageName: string;
      price: number;
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
      total: number;
    };
type SaleRecord = { id: string; receipt: { lines: SaleLine[] } };
import { Button } from "@workspace/ui/components/button";
import { FormField } from "@workspace/ui/components/form-field";
import { useLocale } from "@workspace/ui/lib/i18n";

const refundSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required"),
  disposition: z.enum(["return-to-stock", "damaged-consumed"]),
});

export function SaleRefund({ sale }: { sale: SaleRecord }) {
  const { t } = useLocale();
  const refund = useProductRefund();
  const lines = sale.receipt.lines.filter((line) => line.kind === "product");
  return (
    <div className="grid gap-2">
      {lines.map((line) =>
        line.kind === "product" ? (
          <RefundRow
            key={line.lineId}
            line={line}
            label={t("inventory.refund")}
            disabled={refund.isPending}
            onRefund={(input) =>
              refund.mutate({
                saleId: sale.id,
                idempotencyKey: crypto.randomUUID(),
                lineId: line.lineId,
                quantity: 1,
                ...input,
              })
            }
          />
        ) : null,
      )}
    </div>
  );
}
function RefundRow({
  line,
  label,
  disabled,
  onRefund,
}: {
  line: Extract<SaleLine, { kind: "product" }>;
  label: string;
  disabled: boolean;
  onRefund: (input: {
    disposition: "return-to-stock" | "damaged-consumed";
    reason: string;
  }) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{
    reason: string;
    disposition: "return-to-stock" | "damaged-consumed";
  }>({
    resolver: zodResolver(refundSchema),
    defaultValues: { reason: "", disposition: "return-to-stock" },
  });
  return (
    <form
      className="flex flex-wrap items-start gap-2 border p-2"
      onSubmit={handleSubmit((values) => {
        onRefund(values);
        reset();
      })}
      noValidate
    >
      <span className="min-w-0 flex-1 self-center text-sm">
        {line.productName} × {line.quantity}
      </span>
      <FormField
        label="Reason"
        required
        htmlFor={`refund-reason-${line.lineId}`}
        error={errors.reason?.message}
      >
        <input
          id={`refund-reason-${line.lineId}`}
          className="h-9 border border-input bg-background px-2 text-sm"
          placeholder="Reason"
          aria-invalid={errors.reason ? true : undefined}
          {...register("reason")}
        />
      </FormField>
      <FormField
        label="Disposition"
        required
        htmlFor={`refund-disposition-${line.lineId}`}
        error={errors.disposition?.message}
      >
        <Select
          id={`refund-disposition-${line.lineId}`}
          className="h-9"
          {...register("disposition")}
        >
          <option value="return-to-stock">Return to stock</option>
          <option value="damaged-consumed">Damaged/consumed</option>
        </Select>
      </FormField>
      <Button size="sm" type="submit" disabled={disabled}>
        {label}
      </Button>
    </form>
  );
}
