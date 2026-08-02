import * as React from "react";
import { CalendarDays, CheckCircle2, Clock3, Save, Settings2 } from "lucide-react";
import { useCalendarConfig, useConfigureCalendar, useSchedule, useSession, type DailyHours, type DepositPolicy, type Weekday } from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

const days: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
function hoursLabel(hours: DailyHours | undefined, closed: string) { return !hours || "closed" in hours ? closed : `${hours.open}–${hours.close}`; }
const emptyPackage = { name: "", includedMinutes: "90", weekdayPrice: "", weekendPrice: "", overtimeRate: "", deposit: "", depositPolicy: "return-remainder" as DepositPolicy };

export function CalendarSettings() {
  const { t, locale } = useLocale();
  const { session } = useSession();
  const config = useCalendarConfig();
  const configure = useConfigureCalendar();
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const schedule = useSchedule(date);
  const [timezone, setTimezone] = React.useState("");
  const [hours, setHours] = React.useState<Record<Weekday, DailyHours>>({} as Record<Weekday, DailyHours>);
  const [selectedDay, setSelectedDay] = React.useState<Weekday>("monday");
  const [pkg, setPkg] = React.useState(emptyPackage);

  React.useEffect(() => { if (config.data) { setTimezone(config.data.timezone); setHours(config.data.weekly); } }, [config.data]);
  const isOwner = session?.user?.role === "Owner";
  const save = (input: Parameters<typeof configure.mutate>[0]) => configure.mutate(input);
  const selectedHours = hours[selectedDay] ?? { closed: true, reason: "Closed" };

  if (!isOwner) return <Alert><Settings2 /><AlertTitle>{t("calendar.ownerOnly")}</AlertTitle><AlertDescription>{t("calendar.ownerOnlyDescription")}</AlertDescription></Alert>;
  return <section className="grid gap-6">
    <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("calendar.eyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("calendar.title")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("calendar.subtitle")}</p></header>
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 />{t("calendar.scheduleTitle")}</CardTitle><CardDescription>{t("calendar.scheduleDescription")}</CardDescription></CardHeader><CardContent className="grid gap-5">
        <label className="grid gap-2 text-sm"><span className="font-medium">{t("calendar.timezone")}</span><input className="h-10 border border-input bg-background px-3" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Jakarta" /></label>
        <div className="grid gap-2 sm:grid-cols-2">{days.map((day) => <button type="button" key={day} onClick={() => setSelectedDay(day)} className={cn("flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors hover:bg-muted", selectedDay === day && "border-primary bg-muted") }><span>{t(`calendar.day.${day}` as never)}</span><span className="text-xs text-muted-foreground">{hoursLabel(hours[day], t("calendar.closed"))}</span></button>)}</div>
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="grid gap-2 text-sm"><span>{t("calendar.opens")}</span><input type="time" disabled={"closed" in selectedHours} className="h-10 border border-input bg-background px-3" value={"closed" in selectedHours ? "" : selectedHours.open} onChange={(e) => setHours({ ...hours, [selectedDay]: { open: e.target.value, close: "closed" in selectedHours ? "20:00" : selectedHours.close } })} /></label><label className="grid gap-2 text-sm"><span>{t("calendar.closes")}</span><input type="time" disabled={"closed" in selectedHours} className="h-10 border border-input bg-background px-3" value={"closed" in selectedHours ? "" : selectedHours.close} onChange={(e) => setHours({ ...hours, [selectedDay]: { open: "closed" in selectedHours ? "10:00" : selectedHours.open, close: e.target.value } })} /></label><Button variant="outline" onClick={() => setHours({ ...hours, [selectedDay]: "closed" in selectedHours ? { open: "10:00", close: "20:00" } : { closed: true, reason: t("calendar.closed") } })}>{"closed" in selectedHours ? t("calendar.openDay") : t("calendar.closeDay")}</Button></div>
        <Button onClick={() => save({ timezone, day: selectedDay, hours: hours[selectedDay] })} disabled={configure.isPending}><Save data-icon="inline-start" />{t("calendar.saveSchedule")}</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays />{t("calendar.previewTitle")}</CardTitle><CardDescription>{t("calendar.previewDescription")}</CardDescription></CardHeader><CardContent className="grid gap-4"><label className="grid gap-2 text-sm"><span className="font-medium">{t("calendar.requestedDate")}</span><input type="date" className="h-10 border border-input bg-background px-3" value={date} onChange={(e) => setDate(e.target.value)} /></label>{schedule.data && <div className="grid gap-3 border p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{t(`calendar.day.${schedule.data.weekday}` as never)}</span><span className="text-xs uppercase tracking-wider text-muted-foreground">{schedule.data.period}</span></div><p className="text-lg">{"closed" in schedule.data.hours ? t("calendar.closed") : `${schedule.data.hours.open}–${schedule.data.hours.close}`}</p>{schedule.data.closureReason && <p className="text-sm text-muted-foreground">{schedule.data.closureReason}</p>}</div>}<p className="text-xs text-muted-foreground">{t("calendar.operatingDay")}: {date} · {timezone}</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>{t("calendar.packagesTitle")}</CardTitle><CardDescription>{t("calendar.packagesDescription")}</CardDescription></CardHeader><CardContent className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save({ package: { name: pkg.name, includedMinutes: pkg.includedMinutes ? Number(pkg.includedMinutes) : null, weekdayPrice: Number(pkg.weekdayPrice), weekendPrice: Number(pkg.weekendPrice), overridePrices: {}, overtimeRate: Number(pkg.overtimeRate), deposit: Number(pkg.deposit), depositPolicy: pkg.depositPolicy } }); }}><input required className="h-10 border border-input bg-background px-3" placeholder={t("calendar.packageName")} value={pkg.name} onChange={(e) => setPkg({ ...pkg, name: e.target.value })} /><div className="grid grid-cols-2 gap-3">{(["includedMinutes", "weekdayPrice", "weekendPrice", "overtimeRate", "deposit"] as const).map((field) => <input key={field} required type="number" min="0" className="h-10 border border-input bg-background px-3" placeholder={t(`calendar.${field}` as never)} value={pkg[field]} onChange={(e) => setPkg({ ...pkg, [field]: e.target.value })} />)}</div><select className="h-10 border border-input bg-background px-3" value={pkg.depositPolicy} onChange={(e) => setPkg({ ...pkg, depositPolicy: e.target.value as DepositPolicy })}><option value="return-remainder">{t("calendar.returnRemainder")}</option><option value="forfeit-overtime">{t("calendar.forfeitOvertime")}</option><option value="unlimited-cap">{t("calendar.unlimitedCap")}</option></select><Button type="submit" disabled={configure.isPending}><Save data-icon="inline-start" />{t("calendar.savePackage")}</Button></form><div className="grid content-start gap-3">{config.data?.packages.length ? config.data.packages.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border p-4"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{item.includedMinutes === null ? t("calendar.unlimited") : `${item.includedMinutes} ${t("calendar.minutes")}`} · {formatIdr(item.weekdayPrice, locale)}</p></div><CheckCircle2 className="text-primary" /></div>) : <p className="text-sm text-muted-foreground">{t("calendar.noPackages")}</p>}</div></CardContent></Card>
    {configure.isSuccess && <Alert><CheckCircle2 /><AlertTitle>{t("calendar.saved")}</AlertTitle><AlertDescription>{t("calendar.savedDescription")}</AlertDescription></Alert>}
  </section>;
}
