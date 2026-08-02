import * as React from "react";
import { useConfigureMembershipDiscount, useMembershipDiscounts, useProducts } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useCalendarConfig } from "@kiddy-land/client/react";
import { useLocale } from "@workspace/ui/lib/i18n";

export function MembershipDiscountSettings() {
  const { t } = useLocale(); const config = useCalendarConfig(); const products = useProducts(); const discounts = useMembershipDiscounts(); const save = useConfigureMembershipDiscount();
  return <Card><CardHeader><CardTitle>{t("membership.discounts")}</CardTitle></CardHeader><CardContent className="grid gap-2">{config.data?.packages.map((item) => <DiscountRow key={item.id} label={item.name} value={discounts.data?.ticketPackages[item.id] ?? 0} onSave={(amount) => save.mutate({ kind: "ticketPackages", id: item.id, amount })} />)}{products.data?.map((item) => <DiscountRow key={item.id} label={item.name} value={discounts.data?.products[item.id] ?? 0} onSave={(amount) => save.mutate({ kind: "products", id: item.id, amount })} />)}</CardContent></Card>;
}
function DiscountRow({ label, value, onSave }: { label: string; value: number; onSave: (amount: number) => void }) { const [amount, setAmount] = React.useState(value); React.useEffect(() => setAmount(value), [value]); return <div className="flex items-center justify-between gap-2 border p-2"><span>{label}</span><div className="flex gap-2"><input className="h-9 w-28 border px-2" type="number" min="0" placeholder="IDR discount" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><Button size="sm" onClick={() => onSave(amount)}>Save</Button></div></div>; }
