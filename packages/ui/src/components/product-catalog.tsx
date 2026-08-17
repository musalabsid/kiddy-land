import { useProducts, useCreateProduct, useUpdateProduct, useArchiveProduct, useReactivateProduct } from "@kiddy-land/client/react";
import type { ProductRecord } from "@kiddy-land/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { useLocale } from "@workspace/ui/lib/i18n";
import * as React from "react";

const inputCls = "h-10 w-full border border-input bg-background px-3 text-sm";

const createSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required"),
  name: z.string().trim().min(1, "Name is required"),
  barcode: z.string().trim().optional(),
  price: z.string().min(1, "Price is required").refine((v) => !Number.isNaN(Number(v)), "Price must be a number").refine((v) => Number(v) >= 0, "Price must be 0 or more"),
  stock: z.string().optional(),
  threshold: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <FormField label={label} optional>{children}</FormField>;
}

function ProductRow({ product, onEdit }: { product: ProductRecord; onEdit: (product: ProductRecord) => void }) {
  const archive = useArchiveProduct(); const reactivate = useReactivateProduct();
  return <div className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
    <div className="min-w-0"><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</p></div>
    <div className="flex flex-wrap items-center gap-3 text-sm"><span className={product.stock <= product.lowStockThreshold ? "font-medium text-destructive" : ""}>{product.stock} in stock · threshold {product.lowStockThreshold}</span><span className="text-xs text-muted-foreground">{product.archived ? "Archived" : "Active"}</span>
      <span className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => onEdit(product)}>Edit</Button>
        <Button size="sm" variant="outline" onClick={() => product.archived ? reactivate.mutate({ id: product.id }) : archive.mutate({ id: product.id })}>{product.archived ? "Reactivate" : "Archive"}</Button>
      </span>
    </div>
  </div>;
}

export function ProductCatalog() {
  const { t } = useLocale();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => { const timer = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timer); }, [search]);
  const products = useProducts(debounced || undefined);
  const create = useCreateProduct(); const update = useUpdateProduct();
  const [editing, setEditing] = React.useState<ProductRecord>();
  const [editSku, setEditSku] = React.useState(""); const [editName, setEditName] = React.useState(""); const [editBarcode, setEditBarcode] = React.useState(""); const [editPrice, setEditPrice] = React.useState(""); const [editThreshold, setEditThreshold] = React.useState("");
  const startEdit = (product: ProductRecord) => { setEditing(product); setEditSku(product.sku); setEditName(product.name); setEditBarcode(product.barcode ?? ""); setEditPrice(String(product.price)); setEditThreshold(String(product.lowStockThreshold)); };
  const saveEdit = () => { if (!editing) return; update.mutate({ id: editing.id, sku: editSku, name: editName, barcode: editBarcode || undefined, price: Number(editPrice), lowStockThreshold: Number(editThreshold) }, { onSuccess: () => setEditing(undefined) }); };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { sku: "", name: "", barcode: "", price: "", stock: "", threshold: "" } });
  const submitCreate = handleSubmit((values) => { create.mutate({ sku: values.sku, name: values.name, barcode: values.barcode || undefined, price: Number(values.price), stock: Number(values.stock || 0), lowStockThreshold: Number(values.threshold || 0) }, { onSuccess: () => reset() }); });
  return <Card><CardHeader><CardTitle>{t("inventory.catalog")}</CardTitle><CardDescription>Add and manage the products sold at the venue.</CardDescription></CardHeader><CardContent className="grid gap-4">
    <form className="grid gap-3 border-b pb-4" onSubmit={submitCreate} noValidate>
      <p className="text-sm font-medium">Add a product</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="SKU" required htmlFor="product-sku" error={errors.sku?.message}><input id="product-sku" className={inputCls} {...register("sku")} placeholder="e.g. JUICE-250" aria-invalid={errors.sku ? true : undefined} /></FormField>
        <FormField label="Name" required htmlFor="product-name" error={errors.name?.message}><input id="product-name" className={inputCls} {...register("name")} placeholder="e.g. Orange Juice" aria-invalid={errors.name ? true : undefined} /></FormField>
        <FormField label="Barcode" optional htmlFor="product-barcode" error={errors.barcode?.message}><input id="product-barcode" className={inputCls} {...register("barcode")} placeholder="Optional — scan with camera" /></FormField>
        <FormField label="Price (IDR)" required htmlFor="product-price" error={errors.price?.message}><input id="product-price" className={inputCls} type="number" min="0" step="any" {...register("price")} placeholder="e.g. 7500" aria-invalid={errors.price ? true : undefined} /></FormField>
        <FormField label="Initial stock" optional htmlFor="product-stock" error={errors.stock?.message}><input id="product-stock" className={inputCls} type="number" min="0" {...register("stock")} placeholder="0" /></FormField>
        <FormField label="Low-stock threshold" optional htmlFor="product-threshold" error={errors.threshold?.message}><input id="product-threshold" className={inputCls} type="number" min="0" {...register("threshold")} placeholder="e.g. 5" /></FormField>
      </div>
      <div><Button type="submit" disabled={create.isPending}>{t("inventory.create")}</Button>{create.isError && <p role="alert" className="mt-1 text-sm text-destructive">Could not create product.</p>}</div>
    </form>
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2"><p className="text-sm font-medium">{products.data?.length ?? 0} products</p><FormField label="Search products" optional htmlFor="product-search" className="w-56"><input id="product-search" className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, barcode…" /></FormField></div>
      {editing && <div className="grid gap-3 border border-primary p-3 sm:grid-cols-2 lg:grid-cols-4"><p className="text-sm font-medium sm:col-span-full">Editing: {editing.name}</p><Field label="SKU"><input className={inputCls} value={editSku} onChange={(e) => setEditSku(e.target.value)} /></Field><Field label="Name"><input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} /></Field><Field label="Barcode"><input className={inputCls} value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} /></Field><Field label="Price (IDR)"><input className={inputCls} type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></Field><Field label="Low-stock threshold"><input className={inputCls} type="number" min="0" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} /></Field><div className="flex items-end gap-2"><Button size="sm" onClick={saveEdit} disabled={update.isPending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(undefined)}>Cancel</Button></div></div>}
      {products.isLoading && <p className="text-sm text-muted-foreground">Loading products…</p>}
      {!products.isLoading && (products.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No products yet — add your first one above.</p>}
      {products.data?.map((product) => <ProductRow key={product.id} product={product} onEdit={startEdit} />)}
    </div>
  </CardContent></Card>;
}
