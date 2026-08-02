import { useProducts, useInventoryIntake, useSubmitStockCount, useLowStock, useInventoryCounts, useApproveStockCount } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useLocale } from "@workspace/ui/lib/i18n";

export function InventoryDashboard() {
  const { t } = useLocale(); const products = useProducts(); const lowStock = useLowStock(); const counts = useInventoryCounts(); const approve = useApproveStockCount(); const intake = useInventoryIntake(); const count = useSubmitStockCount();
  return <Card><CardHeader><CardTitle>{t("inventory.title")}</CardTitle></CardHeader><CardContent className="grid gap-3">{products.data?.map((product) => <div className="flex flex-wrap items-center justify-between gap-2 border p-3" key={product.id}><span><strong>{product.name}</strong> <span className="text-muted-foreground">({product.sku}) · {product.stock}</span></span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => intake.mutate({ productId: product.id, quantity: 1, reason: "Inventory intake" })}>{t("inventory.intake")}</Button><Button size="sm" variant="outline" onClick={() => count.mutate({ productId: product.id, counted: product.stock })}>{t("inventory.count")}</Button></div></div>)}{counts.data?.filter((item) => item.status === "pending").map((item) => <Button key={item.id} size="sm" onClick={() => approve.mutate({ id: item.id })}>{t("inventory.approve")}</Button>)}{lowStock.data?.length ? <p className="text-sm text-destructive">{t("inventory.lowStock")}: {lowStock.data.length}</p> : null}</CardContent></Card>;
}
