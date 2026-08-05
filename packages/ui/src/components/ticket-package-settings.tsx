import * as React from "react";
import { CheckCircle2, Save } from "lucide-react";
import { useCalendarConfig, useConfigureCalendar, useSession, type DepositPolicy } from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

const emptyPackage = { name: "", includedMinutes: "90", weekdayPrice: "", weekendPrice: "", overtimeRate: "", deposit: "", depositPolicy: "return-remainder" as DepositPolicy };

export function TicketPackageSettings() {
  const { t, locale } = useLocale();
  const { session } = useSession();
  const config = useCalendarConfig();
  const configure = useConfigureCalendar();
  const [pkg, setPkg] = React.useState(emptyPackage);
  if (session?.user?.role !== "Owner") return <Alert><AlertTitle>{t("calendar.ownerOnly")}</AlertTitle><AlertDescription>{t("calendar.ownerOnlyDescription")}</AlertDescription></Alert>;
  const save = () => configure.mutate({ package: { name: pkg.name, includedMinutes: pkg.includedMinutes === "" ? null : Number(pkg.includedMinutes), weekdayPrice: Number(pkg.weekdayPrice), weekendPrice: Number(pkg.weekendPrice), overridePrices: {}, overtimeRate: Number(pkg.overtimeRate), deposit: Number(pkg.deposit), depositPolicy: pkg.depositPolicy } });
  return <section className="grid gap-6"><header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("calendar.packagesTitle")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("calendar.packagesTitle")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("calendar.packagesDescription")}</p></header><Card><CardHeader><CardTitle>{t("calendar.packagesTitle")}</CardTitle><CardDescription>{t("calendar.packagesDescription")}</CardDescription></CardHeader><CardContent className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}><input required className="h-10 border border-input bg-background px-3" placeholder={t("calendar.packageName")} value={pkg.name} onChange={(e) => setPkg({ ...pkg, name: e.target.value })} /><div className="grid grid-cols-2 gap-3">{(["includedMinutes", "weekdayPrice", "weekendPrice", "overtimeRate", "deposit"] as const).map((field) => <input key={field} required={field !== "includedMinutes"} type="number" min="0" className="h-10 border border-input bg-background px-3" placeholder={t(`calendar.${field}` as never)} value={pkg[field]} onChange={(e) => setPkg({ ...pkg, [field]: e.target.value })} />)}</div><select className="h-10 border border-input bg-background px-3" value={pkg.depositPolicy} onChange={(e) => setPkg({ ...pkg, depositPolicy: e.target.value as DepositPolicy })}><option value="return-remainder">{t("calendar.returnRemainder")}</option><option value="forfeit-overtime">{t("calendar.forfeitOvertime")}</option><option value="unlimited-cap">{t("calendar.unlimitedCap")}</option></select><Button type="submit" disabled={configure.isPending}><Save data-icon="inline-start" />{t("calendar.savePackage")}</Button></form><div className="grid content-start gap-3">{config.data?.packages.length ? config.data.packages.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border p-4"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{item.includedMinutes === null ? t("calendar.unlimited") : `${item.includedMinutes} ${t("calendar.minutes")}`} · {formatIdr(item.weekdayPrice, locale)}</p></div><CheckCircle2 className="text-primary" /></div>) : <p className="text-sm text-muted-foreground">{t("calendar.noPackages")}</p>}</div></CardContent></Card>{configure.isSuccess && <Alert><CheckCircle2 /><AlertTitle>{t("calendar.saved")}</AlertTitle><AlertDescription>{t("calendar.savedDescription")}</AlertDescription></Alert>}</section>;
}
