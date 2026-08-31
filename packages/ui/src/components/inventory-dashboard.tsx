import { zodResolver } from "@hookform/resolvers/zod";
import {
  useProducts,
  useInventoryIntake,
  useSubmitStockCount,
  useLowStock,
} from "@kiddy-land/client/react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useLocale } from "@workspace/ui/lib/i18n";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function InventoryDashboard() {
  const { t } = useLocale();
  const products = useProducts();
  const lowStock = useLowStock();
  const intake = useInventoryIntake();
  const count = useSubmitStockCount();
  const lowIds = new Set(lowStock.data?.map((p) => p.id));
  return (
    <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-4">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {t("inventory.pageEyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("inventory.pageTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("inventory.pageDescription")}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("inventory.title")}</CardTitle>
          <CardDescription>{t("inventory.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {products.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No products
            </p>
          ) : null}
          {products.data?.map((product) => (
            <InventoryRow
              key={product.id}
              product={product}
              isLow={lowIds.has(product.id)}
              onIntake={(quantity) =>
                intake.mutate({
                  productId: product.id,
                  quantity,
                  reason: "Inventory intake",
                })
              }
              onCount={(quantity) =>
                count.mutate({ productId: product.id, counted: quantity })
              }
            />
          ))}
          {lowStock.data?.length ? (
            <p className="text-xs text-destructive">
              {t("inventory.lowStock")}: {lowStock.data.length} products below
              threshold
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryRow({
  product,
  isLow,
  onIntake,
  onCount,
}: {
  product: { id: string; name: string; sku: string; stock: number };
  isLow?: boolean;
  onIntake: (quantity: number) => void;
  onCount: (quantity: number) => void;
}) {
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ quantity: string }>({
    resolver: zodResolver(
      z.object({
        quantity: z
          .string()
          .min(1, "Quantity is required")
          .refine((v) => !Number.isNaN(Number(v)), "Must be a number")
          .refine((v) => Number(v) >= 1, "Quantity must be at least 1"),
      }),
    ),
    defaultValues: { quantity: "1" },
  });
  const [pending, setPending] = React.useState<null | {
    type: "intake" | "count";
    quantity: number;
  }>(null);
  const openIntakeDialog = handleSubmit((values) =>
    setPending({ type: "intake", quantity: Number(values.quantity) }),
  );
  const openCountDialog = handleSubmit((values) =>
    setPending({ type: "count", quantity: Number(values.quantity) }),
  );
  const confirm = () => {
    if (!pending) return;
    if (pending.type === "intake") onIntake(pending.quantity);
    else onCount(pending.quantity);
    reset();
    setPending(null);
  };
  const nextStock =
    pending?.type === "intake"
      ? product.stock + pending.quantity
      : (pending?.quantity ?? product.stock);
  const variance =
    pending?.type === "count" ? pending.quantity - product.stock : null;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border p-4">
        <div className="min-w-0">
          <div className="truncate text-base leading-tight font-semibold">
            {product.name}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{product.sku}</span>
            <span className="hidden sm:inline">·</span>
            <span>
              {t("inventory.stock")}:{" "}
              <span className="font-mono font-medium text-foreground tabular-nums">
                {product.stock}
              </span>
            </span>
            {isLow ? (
              <span className="text-destructive-foreground rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium">
                {t("inventory.low")}
              </span>
            ) : null}
          </div>
        </div>
        <form
          className="flex items-start gap-2"
          onSubmit={(e) => e.preventDefault()}
          noValidate
        >
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Quantity *
            </span>
            <span className="flex gap-2">
              <input
                className="h-9 w-20 border border-input bg-background px-2 text-sm"
                type="number"
                min="1"
                aria-invalid={errors.quantity ? true : undefined}
                {...register("quantity")}
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={openCountDialog}
              >
                {t("inventory.count")}
              </Button>
              <Button size="sm" type="button" onClick={openIntakeDialog}>
                {t("inventory.intake")}
              </Button>
            </span>
          </label>
          {errors.quantity && (
            <p role="alert" className="text-xs text-destructive">
              {errors.quantity.message}
            </p>
          )}
        </form>
      </div>
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === "intake"
                ? t("inventory.intake")
                : t("inventory.count")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.type === "intake"
                ? t("inventory.confirmIntake")
                    .replace("{quantity}", String(pending.quantity))
                    .replace("{name}", product.name)
                    .replace("{current}", String(product.stock))
                    .replace("{next}", String(nextStock))
                : t("inventory.confirmCount")
                    .replace("{name}", product.name)
                    .replace("{counted}", String(pending?.quantity ?? ""))
                    .replace("{current}", String(product.stock))
                    .replace("{next}", String(nextStock))
                    .replace(
                      "{variance}",
                      String(
                        variance !== null && variance > 0
                          ? `+${variance}`
                          : (variance ?? ""),
                      ),
                    )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
