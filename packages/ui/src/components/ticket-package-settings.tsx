import * as React from "react";
import { CheckCircle2, Save } from "lucide-react";
import { useCalendarConfig, useConfigureCalendar, useDeleteTicketPackage, useSession } from "@kiddy-land/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatIdr } from "@kiddy-land/localization";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { Select } from "@workspace/ui/components/select";
import type { TicketPackage } from "@kiddy-land/client";

const packageSchema = z.object({
  name: z.string().trim().min(1, "Package name is required"),
  includedMinutes: z.string().min(1, "Included minutes is required").refine((v) => !Number.isNaN(Number(v)), "Must be a number").refine((v) => Number(v) > 0, "Must be greater than 0"),
  weekdayPrice: z.string().min(1, "Weekday price is required").refine((v) => !Number.isNaN(Number(v)), "Must be a number").refine((v) => Number(v) >= 0, "Must be 0 or more"),
  weekendPrice: z.string().min(1, "Weekend price is required").refine((v) => !Number.isNaN(Number(v)), "Must be a number").refine((v) => Number(v) >= 0, "Must be 0 or more"),
  overtimeRate: z.string().optional().refine((v) => v === "" || v === undefined || !Number.isNaN(Number(v)), "Must be a number").refine((v) => v === "" || v === undefined || Number(v) >= 0, "Must be 0 or more"),
  overtimeThreshold: z.string().optional().refine((v) => v === "" || v === undefined || !Number.isNaN(Number(v)), "Must be a number").refine((v) => v === "" || v === undefined || Number(v) >= 0, "Must be 0 or more"),
  overtimePercentage: z.string().optional().refine((v) => v === "" || v === undefined || !Number.isNaN(Number(v)), "Must be a number").refine((v) => v === "" || v === undefined || (Number(v) >= 0 && Number(v) <= 100), "Must be 0-100"),
  deposit: z.string().min(1, "Deposit is required").refine((v) => !Number.isNaN(Number(v)), "Must be a number").refine((v) => Number(v) >= 0, "Must be 0 or more"),
  depositPolicy: z.enum(["return-remainder", "forfeit-overtime", "unlimited-cap"]),
});
type PackageValues = z.infer<typeof packageSchema>;
const inputCls = "h-10 w-full border border-input bg-background px-3 text-sm";
const emptyPackageValues: PackageValues = { name: "", includedMinutes: "", weekdayPrice: "", weekendPrice: "", overtimeRate: "", overtimeThreshold: "5", overtimePercentage: "10", deposit: "", depositPolicy: "forfeit-overtime" };

function packageValues(item: TicketPackage): PackageValues {
  return {
    name: item.name,
    includedMinutes: item.includedMinutes === null ? "" : String(item.includedMinutes),
    weekdayPrice: String(item.weekdayPrice),
    weekendPrice: String(item.weekendPrice),
    overtimeRate: String(item.overtimeRate),
    overtimeThreshold: String((item as unknown as { overtimeThreshold?: number }).overtimeThreshold ?? 5),
    overtimePercentage: String((item as unknown as { overtimePercentage?: number }).overtimePercentage ?? 10),
    deposit: String(item.deposit),
    depositPolicy: item.depositPolicy,
  };
}

export function TicketPackageSettings() {
  const { t, locale } = useLocale();
  const { session } = useSession();
  const config = useCalendarConfig();
  const configure = useConfigureCalendar();
  const remove = useDeleteTicketPackage();
  const [editing, setEditing] = React.useState<string>();
  const [deleting, setDeleting] = React.useState<TicketPackage>();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PackageValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: emptyPackageValues,
  });
  const watchedPolicy = watch("depositPolicy");

  if (session?.user?.role !== "Owner") return <Alert><AlertTitle>{t("calendar.ownerOnly")}</AlertTitle><AlertDescription>{t("calendar.ownerOnlyDescription")}</AlertDescription></Alert>;

  const submit = handleSubmit((values) => configure.mutate({ package: {
    id: editing,
    name: values.name,
    includedMinutes: Number(values.includedMinutes),
    weekdayPrice: Number(values.weekdayPrice),
    weekendPrice: Number(values.weekendPrice),
    overridePrices: {},
    overtimeRate: Number(values.overtimeRate || "0"),
    overtimeThreshold: values.overtimeThreshold === "" || values.overtimeThreshold === undefined ? 5 : Number(values.overtimeThreshold),
    overtimePercentage: values.overtimePercentage === "" || values.overtimePercentage === undefined ? 10 : Number(values.overtimePercentage),
    deposit: Number(values.deposit),
    depositPolicy: values.depositPolicy,
  } }, { onSuccess: () => { setEditing(undefined); reset(emptyPackageValues); } }));
  const edit = (item: TicketPackage) => { setEditing(item.id); reset(packageValues(item)); };
  const cancelEdit = () => { setEditing(undefined); reset(emptyPackageValues); };
  const activePackages = React.useMemo(() => config.data?.packages.filter((item) => item.active) ?? [], [config.data?.packages]);

  return <div className="w-full max-w-6xl px-5 py-8 sm:px-8"><header className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("calendar.eyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("calendar.packagesTitle")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("calendar.packagesDescription")}</p></header>
    <section className="grid gap-6"><Card>
      <CardHeader><CardTitle>{editing ? t("calendar.editPackage") : t("calendar.createPackage")}</CardTitle><CardDescription>{t("calendar.packageFormDescription")}</CardDescription></CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField className="sm:col-span-2 lg:col-span-3" label={t("calendar.packageName")} required htmlFor="package-name" error={errors.name?.message}><input id="package-name" className={inputCls} placeholder="e.g. Play 60" aria-invalid={errors.name ? true : undefined} {...register("name")} /></FormField>
            <FormField label={t("calendar.includedMinutes")} required htmlFor="package-includedMinutes" error={errors.includedMinutes?.message}><input id="package-includedMinutes" className={inputCls} type="number" min="1" step="1" placeholder="e.g. 60" aria-invalid={errors.includedMinutes ? true : undefined} {...register("includedMinutes")} /></FormField>
            <FormField label={t("calendar.weekdayPrice")} required htmlFor="package-weekdayPrice" error={errors.weekdayPrice?.message}><input id="package-weekdayPrice" className={inputCls} type="number" min="0" step="1" placeholder={t("calendar.weekdayPrice")} aria-invalid={errors.weekdayPrice ? true : undefined} {...register("weekdayPrice")} /></FormField>
            <FormField label={t("calendar.weekendPrice")} required htmlFor="package-weekendPrice" error={errors.weekendPrice?.message}><input id="package-weekendPrice" className={inputCls} type="number" min="0" step="1" placeholder={t("calendar.weekendPrice")} aria-invalid={errors.weekendPrice ? true : undefined} {...register("weekendPrice")} /></FormField>
            <FormField label={t("calendar.deposit")} required htmlFor="package-deposit" error={errors.deposit?.message}><input id="package-deposit" className={inputCls} type="number" min="0" step="1" placeholder={t("calendar.deposit")} aria-invalid={errors.deposit ? true : undefined} {...register("deposit")} /></FormField>
            <FormField label={t("calendar.depositPolicy")} required htmlFor="package-policy"><Select id="package-policy" className={inputCls} aria-invalid={errors.depositPolicy ? true : undefined} {...register("depositPolicy")}>{watchedPolicy === "return-remainder" && <option value="return-remainder">{t("calendar.returnRemainder")} (legacy)</option>}<option value="forfeit-overtime">{t("calendar.forfeitOvertime")}</option><option value="unlimited-cap">{t("calendar.unlimitedCap")}</option></Select></FormField>
            {watchedPolicy === "forfeit-overtime" && <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3">{t("calendar.forfeitAllHint")}</p>}
            {watchedPolicy === "unlimited-cap" && <p className="col-span-2 text-xs text-muted-foreground sm:col-span-3">{t("calendar.gradualHint")}</p>}
            <FormField label={t("calendar.overtimeThreshold")} optional htmlFor="package-threshold" error={errors.overtimeThreshold?.message}><input id="package-threshold" className={inputCls} type="number" min="0" step="1" placeholder="5" aria-invalid={errors.overtimeThreshold ? true : undefined} {...register("overtimeThreshold")} /></FormField>
            {watchedPolicy === "unlimited-cap" && <FormField label={t("calendar.overtimePercentage")} required htmlFor="package-percentage" error={errors.overtimePercentage?.message}><input id="package-percentage" className={inputCls} type="number" min="0" max="100" step="1" placeholder="10" aria-invalid={errors.overtimePercentage ? true : undefined} {...register("overtimePercentage")} /></FormField>}
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={configure.isPending}><Save data-icon="inline-start" />{editing ? t("calendar.updatePackage") : t("calendar.savePackage")}</Button>{editing && <Button type="button" variant="ghost" onClick={cancelEdit}>{t("common.cancel")}</Button>}</div>
        </form>
      </CardContent>
    </Card>
    <section className="grid gap-4"><div><h3 className="text-lg font-semibold">{t("calendar.configuredTitle")}</h3><p className="text-sm text-muted-foreground">{t("calendar.configuredDescription")}</p></div>{config.isLoading ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div> : config.isError ? <Alert variant="destructive"><AlertTitle>Could not load packages</AlertTitle><AlertDescription>Check connection and try again.</AlertDescription></Alert> : !activePackages.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t("calendar.noPackages")}</p> : <div className="grid gap-4 md:grid-cols-2">{activePackages.map((item) => <Card key={item.id}><CardHeader className="pb-3"><CardTitle className="text-base">{item.name}</CardTitle><CardDescription>{item.includedMinutes === null ? t("calendar.unlimited") : `${item.includedMinutes} ${t("calendar.minutes")}`} · {formatIdr(item.weekdayPrice, locale)} weekday</CardDescription></CardHeader><CardContent className="grid gap-3"><div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground"><span>Weekend: {formatIdr(item.weekendPrice, locale)}</span><span>{t("calendar.deposit")}: {formatIdr(item.deposit, locale)}</span><span>{item.depositPolicy === "return-remainder" ? t("calendar.returnRemainder") : item.depositPolicy === "forfeit-overtime" ? t("calendar.forfeitOvertime") : t("calendar.unlimitedCap")}</span></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(item)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => setDeleting(item)} disabled={remove.isPending}>Archive</Button></div></CardContent></Card>)}</div>}</section>
    {configure.isSuccess && <Alert><CheckCircle2 /><AlertTitle>{t("calendar.saved")}</AlertTitle><AlertDescription>{t("calendar.savedDescription")}</AlertDescription></Alert>}
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(undefined); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Archive {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This removes the package from new sales. Existing sales and ticket history stay unchanged. The package can no longer be restored from this screen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) }); }}>Archive package</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section></div>;
}
