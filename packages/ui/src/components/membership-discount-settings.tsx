import {
  useCalendarConfig,
  useConfigureMembershipDiscount,
  useMembershipDiscounts,
  useProducts,
} from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { useLocale } from "@workspace/ui/lib/i18n";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type DiscountKind = "products" | "ticketPackages";
type DiscountField = {
  key: string;
  kind: DiscountKind;
  id: string;
  label: string;
  value: number;
};
type DiscountValues = Record<string, string>;

export function MembershipDiscountSettings() {
  const { t } = useLocale();
  const config = useCalendarConfig();
  const products = useProducts();
  const discounts = useMembershipDiscounts();
  const save = useConfigureMembershipDiscount();
  const [saveError, setSaveError] = React.useState("");
  const fields = React.useMemo<DiscountField[]>(
    () => [
      ...(config.data?.packages
        .filter((item) => item.active)
        .map((item) => ({
          key: `ticketPackages:${item.id}`,
          kind: "ticketPackages" as const,
          id: item.id,
          label: item.name,
          value: discounts.data?.ticketPackages[item.id] ?? 0,
        })) ?? []),
      ...(products.data
        ?.filter((item) => !item.archived)
        .map((item) => ({
          key: `products:${item.id}`,
          kind: "products" as const,
          id: item.id,
          label: item.name,
          value: discounts.data?.products[item.id] ?? 0,
        })) ?? []),
    ],
    [config.data?.packages, discounts.data, products.data],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = useForm<DiscountValues>({ defaultValues: {} });

  React.useEffect(() => {
    if (fields.length)
      reset(
        Object.fromEntries(
          fields.map((field) => [field.key, String(field.value)]),
        ),
      );
  }, [fields, reset]);

  const submit = handleSubmit(async (values) => {
    setSaveError("");
    try {
      for (const field of fields) {
        if (!dirtyFields[field.key]) continue;
        await save.mutateAsync({
          kind: field.kind,
          id: field.id,
          amount: Number(values[field.key]),
        });
      }
      reset(values);
      toast.success("Membership discounts saved.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Discounts could not be saved.",
      );
    }
  });

  return (
    <>
      <header className="mb-4">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {t("membershipDiscount.pageEyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("membershipDiscount.pageTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("membershipDiscount.pageDescription")}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("membership.discounts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={submit} noValidate>
            <div className="hidden grid-cols-[minmax(0,1fr)_12rem] items-center gap-4 px-3 text-xs font-medium text-muted-foreground sm:grid">
              <span>Item</span>
              <span>Discount (IDR)</span>
            </div>
            <div className="grid gap-2">
              {fields.map((field) => (
                <FormField
                  key={field.key}
                  label={field.label}
                  required
                  htmlFor={`discount-${field.key}`}
                  error={errors[field.key]?.message}
                  className="grid grid-cols-1 items-start gap-x-4 gap-y-1 rounded-none border px-3 py-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"
                >
                  <input
                    id={`discount-${field.key}`}
                    className="h-9 w-full border border-input bg-background px-2 text-sm"
                    type="number"
                    min="0"
                    step="1"
                    aria-invalid={errors[field.key] ? true : undefined}
                    {...register(field.key, {
                      required: "Amount is required",
                      validate: (value) =>
                        (Number.isInteger(Number(value)) &&
                          Number(value) >= 0) ||
                        "Amount must be a whole number of 0 or more",
                    })}
                  />
                </FormField>
              ))}
            </div>
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting || save.isPending}
            >
              {t("membership.saveDiscounts")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
