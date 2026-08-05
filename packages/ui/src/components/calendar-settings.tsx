import * as React from "react";
import { CalendarDays, CheckCircle2, Clock3, Save, Settings2 } from "lucide-react";
import { useCalendarConfig, useConfigureCalendar, useSchedule, useSession, type DailyHours, type Weekday } from "@kiddy-land/client/react";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

const days: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
function hoursLabel(hours: DailyHours | undefined, closed: string) { return !hours || "closed" in hours ? closed : `${hours.open}–${hours.close}`; }

export function CalendarSettings() {
  const { t } = useLocale();
  const { session } = useSession();
  const config = useCalendarConfig();
  const configure = useConfigureCalendar();
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const schedule = useSchedule(date);
  const [timezone, setTimezone] = React.useState("");
  const [hours, setHours] = React.useState<Record<Weekday, DailyHours>>({} as Record<Weekday, DailyHours>);
  const [selectedDay, setSelectedDay] = React.useState<Weekday>("monday");
  const [closureReason, setClosureReason] = React.useState("");
  const [overrideKind, setOverrideKind] = React.useState<"closed" | "open" | "pricing">("closed");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [overrideOpen, setOverrideOpen] = React.useState("10:00");
  const [overrideClose, setOverrideClose] = React.useState("20:00");
  const [overridePeriod, setOverridePeriod] = React.useState<"weekday" | "weekend">("weekday");

  React.useEffect(() => { if (config.data) { setTimezone(config.data.timezone); setHours(config.data.weekly); } }, [config.data]);
  React.useEffect(() => { if (configure.isSuccess) { void config.refetch(); void schedule.refetch(); } }, [configure.isSuccess]);
  const isOwner = session?.user?.role === "Owner";
  const save = (input: Parameters<typeof configure.mutate>[0]) => configure.mutate(input);
  const saveOverride = () => save({ override: overrideKind === "closed" ? { date, kind: "closed", reason: overrideReason || t("calendar.closed") } : overrideKind === "open" ? { date, kind: "open", hours: { open: overrideOpen, close: overrideClose }, reason: overrideReason || undefined } : { date, kind: "pricing", period: overridePeriod, reason: overrideReason || undefined } });
  const selectedHours = hours[selectedDay] ?? { closed: true, reason: "Closed" };

  if (!isOwner) return <Alert><Settings2 /><AlertTitle>{t("calendar.ownerOnly")}</AlertTitle><AlertDescription>{t("calendar.ownerOnlyDescription")}</AlertDescription></Alert>;
  return <section className="grid gap-6">
    <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("calendar.eyebrow")}</p><h2 className="text-2xl font-semibold tracking-tight">{t("calendar.title")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("calendar.subtitle")}</p></header>
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 />{t("calendar.scheduleTitle")}</CardTitle><CardDescription>{t("calendar.scheduleDescription")}</CardDescription></CardHeader><CardContent className="grid gap-5">
        <label className="grid gap-2 text-sm"><span className="font-medium">{t("calendar.timezone")}</span><input className="h-10 border border-input bg-background px-3" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Jakarta" /></label>
        <div className="grid gap-2 sm:grid-cols-2">{days.map((day) => <button type="button" key={day} onClick={() => setSelectedDay(day)} className={cn("flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors hover:bg-muted", selectedDay === day && "border-primary bg-muted") }><span>{t(`calendar.day.${day}` as never)}</span><span className="text-xs text-muted-foreground">{hoursLabel(hours[day], t("calendar.closed"))}</span></button>)}</div>
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="grid gap-2 text-sm"><span>{t("calendar.opens")}</span><input type="time" disabled={"closed" in selectedHours} className="h-10 border border-input bg-background px-3" value={"closed" in selectedHours ? "" : selectedHours.open} onChange={(e) => setHours({ ...hours, [selectedDay]: { open: e.target.value, close: "closed" in selectedHours ? "20:00" : selectedHours.close } })} /></label><label className="grid gap-2 text-sm"><span>{t("calendar.closes")}</span><input type="time" disabled={"closed" in selectedHours} className="h-10 border border-input bg-background px-3" value={"closed" in selectedHours ? "" : selectedHours.close} onChange={(e) => setHours({ ...hours, [selectedDay]: { open: "closed" in selectedHours ? "10:00" : selectedHours.open, close: e.target.value } })} /></label><Button variant="outline" onClick={() => setHours({ ...hours, [selectedDay]: "closed" in selectedHours ? { open: "10:00", close: "20:00" } : { closed: true, reason: t("calendar.closed") } })}>{"closed" in selectedHours ? t("calendar.openDay") : t("calendar.closeDay")}</Button></div>
        <label className="grid gap-2 text-sm"><span>{t("calendar.closureReason")}</span><input className="h-10 border border-input bg-background px-3" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} placeholder={t("calendar.closed")} /></label><Button onClick={() => save({ timezone, day: selectedDay, hours: "closed" in selectedHours ? { closed: true, reason: closureReason || t("calendar.closed") } : hours[selectedDay] })} disabled={configure.isPending}><Save data-icon="inline-start" />{t("calendar.saveSchedule")}</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays />{t("calendar.previewTitle")}</CardTitle><CardDescription>{t("calendar.previewDescription")}</CardDescription></CardHeader><CardContent className="grid gap-4"><label className="grid gap-2 text-sm"><span className="font-medium">{t("calendar.requestedDate")}</span><input type="date" className="h-10 border border-input bg-background px-3" value={date} onChange={(e) => setDate(e.target.value)} /></label>{schedule.data && <div className="grid gap-3 border p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{t(`calendar.day.${schedule.data.weekday}` as never)}</span><span className="text-xs uppercase tracking-wider text-muted-foreground">{schedule.data.period}</span></div><p className="text-lg">{"closed" in schedule.data.hours ? t("calendar.closed") : `${schedule.data.hours.open}–${schedule.data.hours.close}`}</p>{schedule.data.closureReason && <p className="text-sm text-muted-foreground">{schedule.data.closureReason}</p>}</div>}<p className="text-xs text-muted-foreground">{t("calendar.operatingDay")}: {date} · {timezone}</p><div className="grid gap-3 border-t pt-4"><p className="text-sm font-medium">{t("calendar.overrideTitle")}</p><div className="grid gap-3 sm:grid-cols-2"><select className="h-10 border border-input bg-background px-3" value={overrideKind} onChange={(e) => setOverrideKind(e.target.value as typeof overrideKind)}><option value="closed">{t("calendar.overrideClosed")}</option><option value="open">{t("calendar.overrideOpen")}</option><option value="pricing">{t("calendar.overridePricing")}</option></select><input className="h-10 border border-input bg-background px-3" placeholder={t("calendar.overrideReason")} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} /></div>{overrideKind === "open" && <div className="grid grid-cols-2 gap-3"><input type="time" className="h-10 border border-input bg-background px-3" value={overrideOpen} onChange={(e) => setOverrideOpen(e.target.value)} /><input type="time" className="h-10 border border-input bg-background px-3" value={overrideClose} onChange={(e) => setOverrideClose(e.target.value)} /></div>}{overrideKind === "pricing" && <select className="h-10 border border-input bg-background px-3" value={overridePeriod} onChange={(e) => setOverridePeriod(e.target.value as typeof overridePeriod)}><option value="weekday">{t("calendar.weekday")}</option><option value="weekend">{t("calendar.weekend")}</option></select>}<Button variant="outline" onClick={saveOverride} disabled={configure.isPending}>{t("calendar.saveOverride")}</Button></div></CardContent></Card>
    </div>
    {configure.isSuccess && <Alert><CheckCircle2 /><AlertTitle>{t("calendar.saved")}</AlertTitle><AlertDescription>{t("calendar.savedDescription")}</AlertDescription></Alert>}
  </section>;
}
