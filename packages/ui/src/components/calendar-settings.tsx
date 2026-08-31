import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCalendarConfig,
  useConfigureCalendar,
  useDeleteCalendarOverride,
  useSchedule,
  useSession,
  useCloseVenue,
  type DailyHours,
  type Weekday,
} from "@kiddy-land/client/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { Select } from "@workspace/ui/components/select";
import { useLocale } from "@workspace/ui/lib/i18n";
import { cn } from "@workspace/ui/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Save,
  Settings2,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const days: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
function hoursLabel(hours: DailyHours | undefined, closed: string) {
  return !hours || "closed" in hours ? closed : `${hours.open}–${hours.close}`;
}

const scheduleSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
});

const inputCls = "h-10 w-full border border-input bg-background px-3 text-sm";

export function CalendarSettings() {
  const { t } = useLocale();
  const closeVenue = useCloseVenue();
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const { session } = useSession();
  const config = useCalendarConfig();
  const configure = useConfigureCalendar();
  const removeOverride = useDeleteCalendarOverride();
  const [date, setDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const schedule = useSchedule(date);
  const [timezone, setTimezone] = React.useState("");
  const [hours, setHours] = React.useState<Record<Weekday, DailyHours>>(
    {} as Record<Weekday, DailyHours>,
  );
  const [selectedDay, setSelectedDay] = React.useState<Weekday>("monday");
  const [closureReason, setClosureReason] = React.useState("");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [overrideKind, setOverrideKind] = React.useState<
    "closed" | "open" | "pricing"
  >("closed");
  const [overrideOpen, setOverrideOpen] = React.useState("10:00");
  const [overrideClose, setOverrideClose] = React.useState("20:00");
  const [overridePeriod, setOverridePeriod] = React.useState<
    "weekday" | "weekend"
  >("weekday");

  const {
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<{ timezone: string }>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { timezone: "" },
  });
  React.useEffect(() => {
    if (config.data) {
      setTimezone(config.data.timezone);
      setHours(config.data.weekly);
      reset({ timezone: config.data.timezone });
    }
  }, [config.data, reset]);
  React.useEffect(() => {
    if (configure.isSuccess) {
      void config.refetch();
      void schedule.refetch();
    }
  }, [configure.isSuccess]);
  const isOwner = session?.user?.role === "Owner";
  const save = (input: Parameters<typeof configure.mutate>[0]) =>
    configure.mutate(input);
  const saveOverride = () =>
    save({
      override:
        overrideKind === "closed"
          ? {
              date,
              kind: "closed",
              reason: overrideReason || t("calendar.closed"),
            }
          : overrideKind === "open"
            ? {
                date,
                kind: "open",
                hours: { open: overrideOpen, close: overrideClose },
                reason: overrideReason || undefined,
              }
            : {
                date,
                kind: "pricing",
                period: overridePeriod,
                reason: overrideReason || undefined,
              },
    });
  const hasOverride = Boolean(
    config.data &&
    (
      config.data as unknown as { overrides: Array<{ date: string }> }
    ).overrides?.some((o) => o.date === date),
  );
  const selectedHours = hours[selectedDay] ?? {
    closed: true,
    reason: "Closed",
  };
  const onTimezoneChange = (value: string) => {
    setTimezone(value);
    setValue("timezone", value, { shouldValidate: true });
  };

  if (!isOwner)
    return (
      <Alert>
        <Settings2 />
        <AlertTitle>{t("calendar.ownerOnly")}</AlertTitle>
        <AlertDescription>
          {t("calendar.ownerOnlyDescription")}
        </AlertDescription>
      </Alert>
    );
  const submitSchedule = handleSubmit(() =>
    save({
      timezone,
      day: selectedDay,
      hours:
        "closed" in selectedHours
          ? { closed: true, reason: closureReason || t("calendar.closed") }
          : hours[selectedDay],
    }),
  );
  return (
    <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-4">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {t("calendar.eyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("calendar.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("calendar.subtitle")}
        </p>
      </header>
      <section className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5 text-foreground" />
                {t("calendar.scheduleTitle")}
              </CardTitle>
              <CardDescription>
                {t("calendar.scheduleDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <FormField
                label={t("calendar.timezone")}
                required
                htmlFor="calendar-timezone"
                error={errors.timezone?.message}
              >
                <input
                  id="calendar-timezone"
                  className={inputCls}
                  aria-invalid={errors.timezone ? true : undefined}
                  value={timezone}
                  onChange={(e) => onTimezoneChange(e.target.value)}
                  placeholder="Asia/Jakarta"
                />
              </FormField>
              <div className="grid gap-2 sm:grid-cols-2">
                {days.map((day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex items-center justify-between border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      selectedDay === day && "border-primary bg-muted",
                    )}
                  >
                    <span>{t(`calendar.day.${day}` as never)}</span>
                    <span className="text-xs text-muted-foreground">
                      {hoursLabel(hours[day], t("calendar.closed"))}
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <FormField
                  label={t("calendar.opens")}
                  htmlFor={`open-${selectedDay}`}
                >
                  <input
                    type="time"
                    id={`open-${selectedDay}`}
                    disabled={"closed" in selectedHours}
                    className="h-10 w-full border border-input bg-background px-3 text-sm"
                    value={"closed" in selectedHours ? "" : selectedHours.open}
                    onChange={(e) =>
                      setHours({
                        ...hours,
                        [selectedDay]: {
                          open: e.target.value,
                          close:
                            "closed" in selectedHours
                              ? "20:00"
                              : selectedHours.close,
                        },
                      })
                    }
                  />
                </FormField>
                <FormField
                  label={t("calendar.closes")}
                  htmlFor={`close-${selectedDay}`}
                >
                  <input
                    type="time"
                    id={`close-${selectedDay}`}
                    disabled={"closed" in selectedHours}
                    className="h-10 w-full border border-input bg-background px-3 text-sm"
                    value={"closed" in selectedHours ? "" : selectedHours.close}
                    onChange={(e) =>
                      setHours({
                        ...hours,
                        [selectedDay]: {
                          open:
                            "closed" in selectedHours
                              ? "10:00"
                              : selectedHours.open,
                          close: e.target.value,
                        },
                      })
                    }
                  />
                </FormField>
                <Button
                  variant="outline"
                  onClick={() =>
                    setHours({
                      ...hours,
                      [selectedDay]:
                        "closed" in selectedHours
                          ? { open: "10:00", close: "20:00" }
                          : { closed: true, reason: t("calendar.closed") },
                    })
                  }
                >
                  {"closed" in selectedHours
                    ? t("calendar.openDay")
                    : t("calendar.closeDay")}
                </Button>
              </div>
              <FormField
                label={t("calendar.closureReason")}
                optional
                htmlFor="calendar-closure-reason"
              >
                <input
                  id="calendar-closure-reason"
                  className="h-10 w-full border border-input bg-background px-3 text-sm"
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder={t("calendar.closed")}
                />
              </FormField>
              <Button
                onClick={() => void submitSchedule()}
                disabled={configure.isPending}
              >
                <Save data-icon="inline-start" />
                {t("calendar.saveSchedule")}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-foreground" />
                {t("calendar.previewTitle")}
              </CardTitle>
              <CardDescription>
                {t("calendar.previewDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                label={t("calendar.requestedDate")}
                htmlFor="calendar-date"
              >
                <input
                  type="date"
                  id="calendar-date"
                  className={inputCls}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </FormField>
              {schedule.data && (
                <div className="grid gap-3 border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {t(`calendar.day.${schedule.data.weekday}` as never)}
                    </span>
                    <span className="text-xs tracking-wider text-muted-foreground uppercase">
                      {schedule.data.period}
                    </span>
                  </div>
                  <p className="text-lg">
                    {"closed" in schedule.data.hours
                      ? t("calendar.closed")
                      : `${schedule.data.hours.open}–${schedule.data.hours.close}`}
                  </p>
                  {schedule.data.closureReason && (
                    <p className="text-sm text-muted-foreground">
                      {schedule.data.closureReason}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("calendar.operatingDay")}: {date} · {timezone}
              </p>
              <div className="grid gap-3 border-t pt-4">
                <p className="text-sm font-medium">
                  {t("calendar.overrideTitle")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label={t("calendar.overrideClosed")}
                    htmlFor="override-kind"
                  >
                    <Select
                      id="override-kind"
                      value={overrideKind}
                      onChange={(e) =>
                        setOverrideKind(e.target.value as typeof overrideKind)
                      }
                    >
                      <option value="closed">
                        {t("calendar.overrideClosed")}
                      </option>
                      <option value="open">{t("calendar.overrideOpen")}</option>
                      <option value="pricing">
                        {t("calendar.overridePricing")}
                      </option>
                    </Select>
                  </FormField>
                  <FormField
                    label={t("calendar.overrideReason")}
                    optional
                    htmlFor="override-reason"
                  >
                    <input
                      id="override-reason"
                      className={inputCls}
                      placeholder={t("calendar.overrideReason")}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                    />
                  </FormField>
                </div>
                {overrideKind === "open" && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label={t("calendar.opens")}
                      htmlFor="override-open"
                    >
                      <input
                        id="override-open"
                        type="time"
                        className={inputCls}
                        value={overrideOpen}
                        onChange={(e) => setOverrideOpen(e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label={t("calendar.closes")}
                      htmlFor="override-close"
                    >
                      <input
                        id="override-close"
                        type="time"
                        className={inputCls}
                        value={overrideClose}
                        onChange={(e) => setOverrideClose(e.target.value)}
                      />
                    </FormField>
                  </div>
                )}
                {overrideKind === "pricing" && (
                  <FormField
                    label={t("calendar.weekday")}
                    htmlFor="override-period"
                  >
                    <Select
                      id="override-period"
                      value={overridePeriod}
                      onChange={(e) =>
                        setOverridePeriod(
                          e.target.value as typeof overridePeriod,
                        )
                      }
                    >
                      <option value="weekday">{t("calendar.weekday")}</option>
                      <option value="weekend">{t("calendar.weekend")}</option>
                    </Select>
                  </FormField>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={saveOverride}
                    disabled={configure.isPending}
                  >
                    {t("calendar.saveOverride")}
                  </Button>
                  {hasOverride && (
                    <Button
                      variant="ghost"
                      onClick={() => removeOverride.mutate(date)}
                      disabled={removeOverride.isPending}
                    >
                      {t("calendar.removeOverride")}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="border-[var(--state-warning)]/30 bg-[var(--state-warning-bg)]/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-[var(--state-warning)]" />
              {t("calendar.closeVenueTitle")}
            </CardTitle>
            <CardDescription>
              {t("calendar.closeVenueDescription")} · {today}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              {t("calendar.closeVenueGrace")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => setCloseConfirmOpen(true)}
                disabled={closeVenue.isPending}
              >
                {closeVenue.isPending
                  ? t("common.loading")
                  : t("calendar.closeVenue")}
              </Button>
              {closeVenue.isSuccess && (
                <span className="text-sm text-[var(--state-success)]">
                  {t("calendar.closeVenueSuccess")}
                </span>
              )}
              {closeVenue.isError && (
                <span className="text-sm text-destructive">
                  {(closeVenue.error as Error).message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("calendar.closeVenueConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="grid gap-2">
                <span>
                  {t("calendar.closeVenueConfirmDescription").replace(
                    "{date}",
                    today,
                  )}
                </span>
                <span className="rounded bg-muted p-2 text-xs">
                  {t("calendar.closeVenueConfirmConsequence")}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={closeVenue.isPending}
                onClick={() => {
                  closeVenue.mutate(today, {
                    onSuccess: () => setCloseConfirmOpen(false),
                  });
                }}
              >
                {t("calendar.closeVenue")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {configure.isSuccess && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>{t("calendar.saved")}</AlertTitle>
            <AlertDescription>
              {t("calendar.savedDescription")}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
