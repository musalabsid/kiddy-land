import { randomBytes } from "node:crypto";

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type DepositPolicy = "return-remainder" | "forfeit-overtime" | "unlimited-cap";
export type PricePeriod = "weekday" | "weekend";
export type DailyHours = { open: string; close: string } | { closed: true; reason?: string };
export type ScheduleOverride = { date: string; kind: "closed"; reason: string } | { date: string; kind: "open"; hours: { open: string; close: string }; reason?: string } | { date: string; kind: "pricing"; period: PricePeriod; reason?: string };
export type TicketPackage = { id: string; name: string; includedMinutes: number | null; weekdayPrice: number; weekendPrice: number; overridePrices: Record<string, number>; overtimeRate: number; deposit: number; depositPolicy: DepositPolicy; active: boolean; version: number };
export type PackageSnapshot = Omit<TicketPackage, "overridePrices"> & { overridePrice?: number; price: number; formattedPrice: string; pricePeriod: PricePeriod; operatingDate: string };
export type EffectiveSchedule = { date: string; weekday: Weekday; period: PricePeriod; hours: DailyHours; closureReason?: string };

function id() { return `pkg_${randomBytes(10).toString("hex")}`; }
function assertDate(date: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must use YYYY-MM-DD"); }
function assertTime(time: string) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Time must use HH:mm"); }
function minutes(time: string) { return Number(time.slice(0, 2)) * 60 + Number(time.slice(3)); }
function formatIdr(amount: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount); }
function localDate(date: Date, timezone: string) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
function weekdayFor(date: string, timezone: string): Weekday { const noon = new Date(`${date}T12:00:00Z`); return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(noon).toLowerCase() as Weekday; }

export function createCalendarStore(initial?: { timezone?: string }) {
  let timezone = initial?.timezone ?? "Asia/Jakarta";
  const weekly: Record<Weekday, DailyHours> = { sunday: { open: "10:00", close: "20:00" }, monday: { closed: true, reason: "Closed" }, tuesday: { closed: true, reason: "Closed" }, wednesday: { closed: true, reason: "Closed" }, thursday: { closed: true, reason: "Closed" }, friday: { closed: true, reason: "Closed" }, saturday: { open: "10:00", close: "20:00" } };
  const overrides = new Map<string, ScheduleOverride>();
  const packages = new Map<string, TicketPackage>();
  const audit: Array<{ action: string; at: number; actorId: string; details: unknown }> = [];

  function setTimezone(value: string, actorId: string) { try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); } catch { throw new Error("Invalid venue timezone"); } timezone = value; audit.push({ action: "calendar.timezone.set", at: Date.now(), actorId, details: { timezone: value } }); }
  function setWeeklyHours(day: Weekday, hours: DailyHours, actorId: string) { if ("open" in hours) { assertTime(hours.open); assertTime(hours.close); if (minutes(hours.open) >= minutes(hours.close)) throw new Error("Opening time must be before closing time"); } weekly[day] = hours; audit.push({ action: "calendar.weekly.set", at: Date.now(), actorId, details: { day, hours } }); }
  function setOverride(override: ScheduleOverride, actorId: string) { assertDate(override.date); if (override.kind === "open") { assertTime(override.hours.open); assertTime(override.hours.close); if (minutes(override.hours.open) >= minutes(override.hours.close)) throw new Error("Opening time must be before closing time"); } overrides.set(override.date, override); audit.push({ action: "calendar.override.set", at: Date.now(), actorId, details: override }); }
  function effectiveSchedule(date: string): EffectiveSchedule { assertDate(date); const weekday = weekdayFor(date, timezone); const base = weekly[weekday]; const override = overrides.get(date); if (!override) return { date, weekday, period: weekday === "saturday" || weekday === "sunday" ? "weekend" : "weekday", hours: base, closureReason: "closed" in base ? base.reason : undefined }; if (override.kind === "closed") return { date, weekday, period: "weekday", hours: { closed: true }, closureReason: override.reason }; if (override.kind === "open") return { date, weekday, period: weekday === "saturday" || weekday === "sunday" ? "weekend" : "weekday", hours: override.hours, closureReason: override.reason }; return { date, weekday, period: override.period, hours: base, closureReason: "closed" in base ? base.reason : undefined }; }
  function operatingDate(at = new Date()) { return localDate(at, timezone); }
  function canOperate(date: string, at: string, action = "operate") { const schedule = effectiveSchedule(date); if ("closed" in schedule.hours) return { allowed: false, reason: schedule.closureReason ?? "Venue is closed", schedule }; if (minutes(at) < minutes(schedule.hours.open) || minutes(at) >= minutes(schedule.hours.close)) return { allowed: false, reason: `Venue is closed outside ${schedule.hours.open}-${schedule.hours.close}`, schedule }; return { allowed: true, reason: action, schedule }; }
  function upsertPackage(input: Omit<TicketPackage, "id" | "version" | "active"> & { id?: string }, actorId: string) { if (input.includedMinutes !== null && (!Number.isInteger(input.includedMinutes) || input.includedMinutes <= 0)) throw new Error("Included duration must be positive"); for (const amount of [input.weekdayPrice, input.weekendPrice, input.overtimeRate, input.deposit]) if (!Number.isInteger(amount) || amount < 0) throw new Error("Amounts must be non-negative IDR integers"); if (input.depositPolicy === "unlimited-cap" && input.includedMinutes !== null) throw new Error("Unlimited-cap policy requires an Unlimited Package"); const previous = input.id ? packages.get(input.id) : undefined; const value: TicketPackage = { ...input, id: previous?.id ?? input.id ?? id(), version: (previous?.version ?? 0) + 1, active: true }; packages.set(value.id, value); audit.push({ action: "ticket-package.upsert", at: Date.now(), actorId, details: { id: value.id, version: value.version } }); return value; }
  function snapshot(packageId: string, date: string): PackageSnapshot { const packageValue = packages.get(packageId); if (!packageValue || !packageValue.active) throw new Error("Ticket Package is unavailable"); const schedule = effectiveSchedule(date); if ("closed" in schedule.hours) throw new Error(schedule.closureReason ?? "Venue is closed"); const overridePrice = packageValue.overridePrices[date]; const price = overridePrice ?? (schedule.period === "weekend" ? packageValue.weekendPrice : packageValue.weekdayPrice); return { ...packageValue, overridePrice, price, formattedPrice: formatIdr(price), pricePeriod: schedule.period, operatingDate: date }; }
  return { get timezone() { return timezone; }, weekly, overrides, packages, audit, setTimezone, setWeeklyHours, setOverride, effectiveSchedule, operatingDate, canOperate, upsertPackage, snapshot };
}

export type CalendarStore = ReturnType<typeof createCalendarStore>;
