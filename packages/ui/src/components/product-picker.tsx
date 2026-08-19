import * as React from "react";
import { useProducts, type ProductRecord } from "@kiddy-land/client/react";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@workspace/ui/components/combobox";
import { FormField } from "@workspace/ui/components/form-field";
import { useLocale } from "@workspace/ui/lib/i18n";

export function ProductPicker({ value, onSelect }: { value?: ProductRecord; onSelect: (product?: ProductRecord) => void }) {
  const { t } = useLocale();
  const [query, setQuery] = React.useState("");
  const products = useProducts(query.trim() || undefined, { enabled: query.trim().length > 0 });
  const label = (id: string) => { const product = products.data?.find((item) => item.id === id) ?? value; return product ? `${product.name} · ${product.sku}` : ""; };
  return <FormField label={t("sale.product")} required htmlFor="cashier-product">
    <Combobox value={value?.id ?? null} onValueChange={(id) => onSelect(typeof id === "string" ? products.data?.find((item) => item.id === id) ?? (value?.id === id ? value : undefined) : undefined)} onInputValueChange={setQuery} itemToStringLabel={label}>
      <ComboboxInput id="cashier-product" placeholder={t("sale.productSearchPlaceholder")} showClear />
      <ComboboxContent>
        <ComboboxList>
          {products.isFetching ? <ComboboxEmpty>{t("sale.searchingProducts")}</ComboboxEmpty> : null}
          {products.data?.map((product) => <ComboboxItem key={product.id} value={product.id}>{product.name} · {product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</ComboboxItem>)}
          {!products.isFetching && query.trim() && !products.data?.length ? <ComboboxEmpty>{t("sale.noProducts")}</ComboboxEmpty> : null}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  </FormField>;
}
