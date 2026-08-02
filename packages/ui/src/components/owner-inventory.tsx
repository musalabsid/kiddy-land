import { useInventoryMovements, useInventoryExceptions, useLowStock, useProducts } from "@kiddy-land/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useLocale } from "@workspace/ui/lib/i18n";

export function OwnerInventory() {
  const { t } = useLocale(); const products = useProducts(); const lowStock = useLowStock(); const movements = useInventoryMovements(); const exceptions = useInventoryExceptions();
  return <Card><CardHeader><CardTitle>{t("inventory.ownerOverview")}</CardTitle></CardHeader><CardContent className="grid gap-3"><p className="text-sm">{t("inventory.lowStock")}: {lowStock.data?.length ?? 0}</p><p className="text-sm">{t("inventory.movements")}: {movements.data?.length ?? 0}</p><p className="text-sm">Exceptions: {exceptions.data?.length ?? 0}</p>{products.data?.filter((item) => item.stock <= item.lowStockThreshold).map((item) => <div className="border p-2 text-sm" key={item.id}>{item.name} · {item.stock}</div>)}</CardContent></Card>;
}
