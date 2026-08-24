import { useProducts, useCreateProduct, useUpdateProduct, useArchiveProduct, useReactivateProduct, useUploadProductImage, useDeleteProductImage } from "@kiddy-land/client/react";
import type { ProductRecord } from "@kiddy-land/client";
import { useClient } from "@kiddy-land/client/react";
import { toast } from "sonner";
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

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return <FormField label={label} optional htmlFor={htmlFor}>{children}</FormField>;
}

function ProductRow({ product, onEdit }: { product: ProductRecord; onEdit: (product: ProductRecord) => void }) {
  const { t } = useLocale();
  const archive = useArchiveProduct(); const reactivate = useReactivateProduct(); const client = useClient();
  return <div className="flex flex-wrap items-center justify-between gap-2 border border-border p-3">
    <div className="flex items-center gap-3 min-w-0">{product.imageUrl ? <img src={`${client.origin}${product.imageUrl}?access_token=${client.getToken() ?? ""}`} alt={product.name} className="size-12 shrink-0 object-cover border" /> : <div className="size-12 shrink-0 border bg-muted" /> }<div className="min-w-0"><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</p></div></div>
    <div className="flex flex-wrap items-center gap-3 text-sm"><span className={product.stock <= product.lowStockThreshold ? "font-medium text-destructive" : ""}>{product.stock} {t("inventory.inStock")} · {t("inventory.threshold")} {product.lowStockThreshold}</span><span className="text-xs text-muted-foreground">{product.archived ? t("inventory.archived") : t("inventory.active")}</span>
      <span className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => onEdit(product)}>Edit</Button>
        <Button size="sm" variant="outline" onClick={() => product.archived ? reactivate.mutate({ id: product.id }) : archive.mutate({ id: product.id })}>{product.archived ? "Reactivate" : "Archive"}</Button>
      </span>
    </div>
  </div>;
}

export function ProductCatalog() {
  const { t } = useLocale();
  const client = useClient();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => { const timer = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timer); }, [search]);
  const products = useProducts(debounced || undefined);
  const create = useCreateProduct(); const update = useUpdateProduct(); const upload = useUploadProductImage(); const removeImage = useDeleteProductImage();
  const [editing, setEditing] = React.useState<ProductRecord>();
  const [editSku, setEditSku] = React.useState(""); const [editName, setEditName] = React.useState(""); const [editBarcode, setEditBarcode] = React.useState(""); const [editPrice, setEditPrice] = React.useState(""); const [editThreshold, setEditThreshold] = React.useState(""); const [editFile, setEditFile] = React.useState<File | undefined>();
  const [createFile, setCreateFile] = React.useState<File | undefined>();
  const createPreview = React.useMemo(() => createFile ? URL.createObjectURL(createFile) : undefined, [createFile]);
  React.useEffect(() => () => { if (createPreview) URL.revokeObjectURL(createPreview); }, [createPreview]);
  const editPreview = React.useMemo(() => editFile ? URL.createObjectURL(editFile) : undefined, [editFile]);
  React.useEffect(() => () => { if (editPreview) URL.revokeObjectURL(editPreview); }, [editPreview]);
  const startEdit = (product: ProductRecord) => { setEditing(product); setEditSku(product.sku); setEditName(product.name); setEditBarcode(product.barcode ?? ""); setEditPrice(String(product.price)); setEditThreshold(String(product.lowStockThreshold)); setEditFile(undefined); };
  const saveEdit = () => { if (!editing) return; update.mutate({ id: editing.id, sku: editSku, name: editName, barcode: editBarcode || undefined, price: Number(editPrice), lowStockThreshold: Number(editThreshold) }, { onSuccess: async (p) => { if (editFile) { if (editFile.size > 5*1024*1024) { toast.error(t("inventory.imageTooLarge")); return; } try { await upload.mutateAsync({ id: p.id, file: editFile }); toast.success(t("inventory.productUpdatedWithImage")); } catch(e){ toast.error(e instanceof Error ? e.message : t("inventory.imageUploadFailed")); } } setEditing(undefined); setEditFile(undefined); } }); };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { sku: "", name: "", barcode: "", price: "", stock: "", threshold: "" } });
  const submitCreate = handleSubmit(async (values) => {
    try {
      const p = await create.mutateAsync({ sku: values.sku, name: values.name, barcode: values.barcode || undefined, price: Number(values.price), stock: Number(values.stock || 0), lowStockThreshold: Number(values.threshold || 0) });
      if (createFile) {
        if (createFile.size > 5*1024*1024) { toast.error(t("inventory.imageTooLarge")); reset(); setCreateFile(undefined); return; }
        try { await upload.mutateAsync({ id: p.id, file: createFile }); toast.success(t("inventory.productCreatedWithImage")); } catch(e){ toast.error(e instanceof Error ? e.message : t("inventory.imageUploadFailedNoImage")); }
      }
      reset(); setCreateFile(undefined);
    } catch {}
  });
  return <div className="w-full max-w-6xl px-5 py-8 sm:px-8"><header className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("product.pageEyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("product.pageTitle")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("product.pageDescription")}</p></header><Card><CardHeader><CardTitle>{t("inventory.catalog")}</CardTitle><CardDescription>{t("inventory.catalogDescription")}</CardDescription></CardHeader><CardContent className="grid gap-4">
    <form className="grid gap-3 border-b pb-4" onSubmit={submitCreate} noValidate>
      <p className="text-sm font-medium">{t("inventory.addProductTitle")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label={t("inventory.sku")} required htmlFor="product-sku" error={errors.sku?.message}><input id="product-sku" className={inputCls} {...register("sku")} placeholder={t("inventory.skuExample")} aria-invalid={errors.sku ? true : undefined} /></FormField>
        <FormField label={t("inventory.nameLabel")} required htmlFor="product-name" error={errors.name?.message}><input id="product-name" className={inputCls} {...register("name")} placeholder={t("inventory.nameExample")} aria-invalid={errors.name ? true : undefined} /></FormField>
        <FormField label={t("inventory.barcode")} optional htmlFor="product-barcode" error={errors.barcode?.message}><input id="product-barcode" className={inputCls} {...register("barcode")} placeholder={t("inventory.barcodeExample")} /></FormField>
        <FormField label={t("inventory.priceIdr")} required htmlFor="product-price" error={errors.price?.message}><input id="product-price" className={inputCls} type="number" min="0" step="any" {...register("price")} placeholder={t("inventory.priceExample")} aria-invalid={errors.price ? true : undefined} /></FormField>
        <FormField label={t("inventory.initialStock")} optional htmlFor="product-stock" error={errors.stock?.message}><input id="product-stock" className={inputCls} type="number" min="0" {...register("stock")} placeholder="0" /></FormField>
        <FormField label={t("inventory.lowStockThreshold")} optional htmlFor="product-threshold" error={errors.threshold?.message}><input id="product-threshold" className={inputCls} type="number" min="0" {...register("threshold")} placeholder="e.g. 5" /></FormField>
        <FormField label={t("inventory.productImage")} optional htmlFor="product-image"><input id="product-image" className={inputCls} type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(f && f.size>5*1024*1024){ toast.error(t("inventory.imageTooLarge")); e.target.value=""; return;} setCreateFile(f);}} />{createPreview ? <img src={createPreview} alt={t("inventory.previewAlt")} className="mt-2 h-24 w-24 object-cover border" /> : null}<p className="text-xs text-muted-foreground">{t("inventory.imageHint")}</p></FormField>
      </div>
      <div><Button type="submit" disabled={create.isPending || upload.isPending}>{upload.isPending ? t("inventory.uploading") : t("inventory.create")}</Button>{create.isError && <p role="alert" className="mt-1 text-sm text-destructive">{t("inventory.createError")}</p>}</div>
    </form>
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2"><p className="text-sm font-medium">{products.data?.length ?? 0} products</p><FormField label={t("inventory.searchLabel")} optional htmlFor="product-search" className="w-56"><input id="product-search" className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("inventory.searchPlaceholder")} /></FormField></div>
      {editing && <div className="grid gap-3 border border-primary p-3 sm:grid-cols-2 lg:grid-cols-3 items-start"><p className="text-sm font-medium sm:col-span-full border-b pb-2">{t("inventory.editing")} {editing.name}</p><Field label={t("inventory.sku")} htmlFor="edit-sku"><input id="edit-sku" className={inputCls} value={editSku} onChange={(e) => setEditSku(e.target.value)} /></Field><Field label={t("inventory.nameLabel")} htmlFor="edit-name"><input id="edit-name" className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} /></Field><Field label={t("inventory.barcode")} htmlFor="edit-barcode"><input id="edit-barcode" className={inputCls} value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} /></Field><Field label={t("inventory.priceIdr")} htmlFor="edit-price"><input id="edit-price" className={inputCls} type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></Field><Field label={t("inventory.lowStockThreshold")} htmlFor="edit-threshold"><input id="edit-threshold" className={inputCls} type="number" min="0" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} /></Field><div className="flex flex-col gap-2"><FormField label={t("inventory.productImage")} optional><input className={inputCls} type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(f && f.size>5*1024*1024){ toast.error(t("inventory.imageTooLarge")); e.target.value=""; return;} setEditFile(f);}} />{editPreview ? <img src={editPreview} alt={t("inventory.previewAlt")} className="mt-2 h-24 w-24 object-cover border" /> : editing.imageUrl ? <img src={`${client.origin}${editing.imageUrl}?access_token=${client.getToken() ?? ""}`} alt={editing.name} className="mt-2 h-24 w-24 object-cover border" /> : <span className="text-xs text-muted-foreground">{t("inventory.imageHint")}</span>}</FormField>{editing.imageUrl && !editFile && <Button size="sm" variant="ghost" onClick={()=> removeImage.mutate({ id: editing.id }, { onSuccess: ()=> { toast.success(t("inventory.imageRemoved")); setEditing((p)=> p ? {...p, imageUrl: undefined} : p);}})}>{t("inventory.removeImage")}</Button>}{editFile && <Button size="sm" variant="ghost" onClick={()=> setEditFile(undefined)}>{t("inventory.clearSelected")}</Button>}</div><div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 border-t pt-3"><Button size="sm" variant="ghost" onClick={() => setEditing(undefined)}>{t("inventory.cancel")}</Button><Button size="sm" onClick={saveEdit} disabled={update.isPending || upload.isPending}>{t("inventory.save")}</Button></div></div>}
      {products.isLoading && <p className="text-sm text-muted-foreground">{t("inventory.loading")}</p>}
      {!products.isLoading && (products.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">{t("inventory.empty")}</p>}
      {products.data?.map((product) => <ProductRow key={product.id} product={product} onEdit={startEdit} />)}
    </div>
  </CardContent></Card></div>;
}
