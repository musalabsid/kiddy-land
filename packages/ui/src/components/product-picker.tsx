import {
  useProducts,
  useClient,
  type ProductRecord,
} from "@kiddy-land/client/react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
import { FormField } from "@workspace/ui/components/form-field";
import { useLocale } from "@workspace/ui/lib/i18n";
import * as React from "react";

export function ProductPicker({
  value,
  onSelect,
}: {
  value?: ProductRecord;
  onSelect: (product?: ProductRecord) => void;
}) {
  const { t } = useLocale();
  const client = useClient();
  const [query, setQuery] = React.useState("");
  const imgSrc = (product: ProductRecord) =>
    product.imageUrl
      ? `${client.origin}${product.imageUrl}?access_token=${client.getToken() ?? ""}`
      : undefined;
  const products = useProducts(query.trim() || undefined);
  const label = (id: string) => {
    const product = products.data?.find((item) => item.id === id) ?? value;
    return product ? `${product.name} · ${product.sku}` : "";
  };
  return (
    <FormField label={t("sale.product")} required htmlFor="cashier-product">
      <Combobox
        value={value?.id ?? null}
        onValueChange={(id) =>
          onSelect(
            typeof id === "string"
              ? (products.data?.find((item) => item.id === id) ??
                  (value?.id === id ? value : undefined))
              : undefined,
          )
        }
        onInputValueChange={setQuery}
        itemToStringLabel={label}
      >
        <ComboboxInput
          id="cashier-product"
          placeholder={t("sale.productSearchPlaceholder")}
          showClear
        />
        <ComboboxContent className="w-auto max-w-96 min-w-(--anchor-width)">
          <ComboboxList>
            {products.isFetching ? (
              <ComboboxEmpty>{t("sale.searchingProducts")}</ComboboxEmpty>
            ) : null}
            {products.data?.map((product) => (
              <ComboboxItem key={product.id} value={product.id}>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {imgSrc(product) ? (
                    <img
                      src={imgSrc(product)}
                      alt={product.name}
                      className="size-6 shrink-0 rounded-none object-cover"
                    />
                  ) : (
                    <span className="size-6 shrink-0 border bg-muted" />
                  )}
                  <span>
                    {product.name} · {product.sku}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </span>
                </span>
              </ComboboxItem>
            ))}
            {!products.isFetching && !products.data?.length ? (
              <ComboboxEmpty>{t("sale.noProducts")}</ComboboxEmpty>
            ) : null}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </FormField>
  );
}
