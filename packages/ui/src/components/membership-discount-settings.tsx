import { useConfigureMembershipDiscount, useMembershipDiscounts, useProducts } from "@kiddy-land/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useCalendarConfig } from "@kiddy-land/client/react";
import { useLocale } from "@workspace/ui/lib/i18n";

export function MembershipDiscountSettings() {
  const { t } = useLocale(); const config = useCalendarConfig(); const products = useProducts(); const discounts = useMembershipDiscounts(); const save = useConfigureMembershipDiscount();
  return <Card><CardHeader><CardTitle>{t("membership.discounts")}</CardTitle></CardHeader><CardContent className="grid gap-2">{config.data?.packages.map((item) => <DiscountRow key={item.id} label={item.name} value={discounts.data?.ticketPackages[item.id] ?? 0} onSave={(amount) => save.mutate({ kind: "ticketPackages", id: item.id, amount })} />)}{products.data?.map((item) => <DiscountRow key={item.id} label={item.name} value={discounts.data?.products[item.id] ?? 0} onSave={(amount) => save.mutate({ kind: "products", id: item.id, amount })} />)}</CardContent></Card>;
}
const discountSchema = z.object({ amount: z.string().min(1, "Amount is required").refine((v) => !Number.isNaN(Number(v)), "Amount must be a number").refine((v) => Number(v) >= 0, "Amount must be 0 or more") });
function DiscountRow({ label, value, onSave }: { label: string; value: number; onSave: (amount: number) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<{ amount: string }>({ resolver: zodResolver(discountSchema), defaultValues: { amount: String(value) }, values: { amount: String(value) } });
  return <form className="flex flex-wrap items-center justify-between gap-2 border p-2" onSubmit={handleSubmit((v) => onSave(Number(v.amount)))} noValidate>
    <span className="min-w-0 flex-1 text-sm">{label}</span>
    <div className="flex items-start gap-2">
      <div className="grid gap-1">
        <input className="h-9 w-28 border border-input bg-background px-2 text-sm" type="number" min="0" placeholder="IDR discount" aria-invalid={errors.amount ? true : undefined} {...register("amount")} />
        {errors.amount && <p role="alert" className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>
      <Button type="submit" size="sm" className="h-9">Save</Button>
    </div>
  </form>;
}
