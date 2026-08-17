import { useProducts, useInventoryIntake, useSubmitStockCount, useLowStock, useInventoryCounts, useApproveStockCount } from "@kiddy-land/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useLocale } from "@workspace/ui/lib/i18n";

export function InventoryDashboard() {
  const { t } = useLocale(); const products = useProducts(); const lowStock = useLowStock(); const counts = useInventoryCounts(); const approve = useApproveStockCount(); const intake = useInventoryIntake(); const count = useSubmitStockCount();
  return <Card><CardHeader><CardTitle>{t("inventory.title")}</CardTitle></CardHeader><CardContent className="grid gap-3">{products.data?.map((product) => <InventoryRow key={product.id} product={product} onIntake={(quantity) => intake.mutate({ productId: product.id, quantity, reason: "Inventory intake" })} onCount={(quantity) => count.mutate({ productId: product.id, counted: quantity })} />)}{counts.data?.filter((item) => item.status === "pending").map((item) => <Button key={item.id} size="sm" onClick={() => approve.mutate({ id: item.id })}>{t("inventory.approve")}</Button>)}{lowStock.data?.length ? <p className="text-sm text-destructive">{t("inventory.lowStock")}: {lowStock.data.length}</p> : null}</CardContent></Card>;
}
function InventoryRow({ product, onIntake, onCount }: { product: { id: string; name: string; sku: string; stock: number }; onIntake: (quantity: number) => void; onCount: (quantity: number) => void }) {
  const { t } = useLocale();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ quantity: string }>({ resolver: zodResolver(z.object({ quantity: z.string().min(1, "Quantity is required").refine((v) => !Number.isNaN(Number(v)), "Must be a number").refine((v) => Number(v) >= 1, "Quantity must be at least 1") })), defaultValues: { quantity: "1" } });
  return <div className="flex flex-wrap items-center justify-between gap-2 border p-3"><span><strong>{product.name}</strong> <span className="text-muted-foreground">({product.sku}) · {product.stock}</span></span><form className="flex items-start gap-2" onSubmit={handleSubmit((values) => { const quantity = Number(values.quantity); onIntake(quantity); reset(); })} noValidate><label className="grid gap-1 text-sm"><span className="text-xs font-medium text-muted-foreground">Quantity *</span><span className="flex gap-2"><input className="h-9 w-20 border border-input bg-background px-2 text-sm" type="number" min="1" aria-invalid={errors.quantity ? true : undefined} {...register("quantity")} /><Button size="sm" variant="outline" type="button" onClick={() => void handleSubmit((values) => onCount(Number(values.quantity)))()}>{t("inventory.count")}</Button><Button size="sm" type="submit">{t("inventory.intake")}</Button></span></label>{errors.quantity && <p role="alert" className="text-xs text-destructive">{errors.quantity.message}</p>}</form></div>;
}
