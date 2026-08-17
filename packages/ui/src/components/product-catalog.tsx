import { useProducts, useCreateProduct, useUpdateProduct, useArchiveProduct, useReactivateProduct } from "@kiddy-land/client/react";
import type { ProductRecord } from "@kiddy-land/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useLocale } from "@workspace/ui/lib/i18n";
import * as React from "react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

const inputCls = "h-9 w-full border border-input bg-background px-2 text-sm";

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
  const [sku, setSku] = React.useState(""); const [name, setName] = React.useState(""); const [barcode, setBarcode] = React.useState(""); const [price, setPrice] = React.useState(""); const [stock, setStock] = React.useState(""); const [threshold, setThreshold] = React.useState("");
  const [editing, setEditing] = React.useState<ProductRecord>();
  const [editSku, setEditSku] = React.useState(""); const [editName, setEditName] = React.useState(""); const [editBarcode, setEditBarcode] = React.useState(""); const [editPrice, setEditPrice] = React.useState(""); const [editThreshold, setEditThreshold] = React.useState("");
  const startEdit = (product: ProductRecord) => { setEditing(product); setEditSku(product.sku); setEditName(product.name); setEditBarcode(product.barcode ?? ""); setEditPrice(String(product.price)); setEditThreshold(String(product.lowStockThreshold)); };
  const saveEdit = () => { if (!editing) return; update.mutate({ id: editing.id, sku: editSku, name: editName, barcode: editBarcode || undefined, price: Number(editPrice), lowStockThreshold: Number(editThreshold) }, { onSuccess: () => setEditing(undefined) }); };
  const submitCreate = () => { if (!sku.trim() || !name.trim() || !price) return; create.mutate({ sku: sku.trim(), name: name.trim(), barcode: barcode.trim() || undefined, price: Number(price), stock: Number(stock || 0), lowStockThreshold: Number(threshold || 0) }, { onSuccess: () => { setSku(""); setName(""); setBarcode(""); setPrice(""); setStock(""); setThreshold(""); } }); };
  return <Card><CardHeader><CardTitle>{t("inventory.catalog")}</CardTitle><CardDescription>Add and manage the products sold at the venue.</CardDescription></CardHeader><CardContent className="grid gap-4">
    <div className="grid gap-3 border-b pb-4">
      <p className="text-sm font-medium">Add a product</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="SKU *"><input className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. JUICE-250" /></Field>
        <Field label="Name *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Orange Juice" /></Field>
        <Field label="Barcode"><input className={inputCls} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional — scan with camera" /></Field>
        <Field label="Price (IDR) *"><input className={inputCls} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 7500" /></Field>
        <Field label="Initial stock"><input className={inputCls} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" /></Field>
        <Field label="Low-stock threshold"><input className={inputCls} type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="e.g. 5" /></Field>
      </div>
      <div><Button onClick={submitCreate} disabled={create.isPending || !sku.trim() || !name.trim() || !price}>{t("inventory.create")}</Button>{create.isError && <p role="alert" className="mt-1 text-sm text-destructive">Could not create product.</p>}</div>
    </div>
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{products.data?.length ?? 0} products</p><input className={`${inputCls} w-56`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, barcode…" aria-label="Search products" /></div>
      {editing && <div className="grid gap-3 border border-primary p-3 sm:grid-cols-2 lg:grid-cols-4"><p className="text-sm font-medium sm:col-span-full">Editing: {editing.name}</p><Field label="SKU"><input className={inputCls} value={editSku} onChange={(e) => setEditSku(e.target.value)} /></Field><Field label="Name"><input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} /></Field><Field label="Barcode"><input className={inputCls} value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} /></Field><Field label="Price (IDR)"><input className={inputCls} type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></Field><Field label="Low-stock threshold"><input className={inputCls} type="number" min="0" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} /></Field><div className="flex items-end gap-2"><Button size="sm" onClick={saveEdit} disabled={update.isPending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(undefined)}>Cancel</Button></div></div>}
      {products.isLoading && <p className="text-sm text-muted-foreground">Loading products…</p>}
      {!products.isLoading && (products.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No products yet — add your first one above.</p>}
      {products.data?.map((product) => <ProductRow key={product.id} product={product} onEdit={startEdit} />)}
    </div>
  </CardContent></Card>;
}
