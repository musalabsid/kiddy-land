export type Weekday = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
export type DepositPolicy = "return-remainder" | "forfeit-overtime" | "unlimited-cap";
export type PricePeriod = "weekday" | "weekend";
export type DailyHours = { open: string; close: string } | { closed: true; reason?: string };
export type ScheduleOverride =
  | { date: string; kind: "closed"; reason: string }
  | { date: string; kind: "open"; hours: { open: string; close: string }; reason?: string }
  | { date: string; kind: "pricing"; period: PricePeriod; reason?: string };
export type TicketPackage = {
  id: string;
  name: string;
  includedMinutes: number | null;
  weekdayPrice: number;
  weekendPrice: number;
  overridePrices: Record<string, number>;
  overtimeRate: number;
  overtimeThreshold: number;
  overtimePercentage: number;
  deposit: number;
  depositPolicy: DepositPolicy;
  active: boolean;
  version: number;
};
export type EffectiveSchedule = {
  date: string;
  weekday: Weekday;
  period: PricePeriod;
  hours: DailyHours;
  closureReason?: string;
};
export type CalendarConfig = {
  timezone: string;
  weekly: Record<Weekday, DailyHours>;
  overrides: ScheduleOverride[];
  packages: TicketPackage[];
  audit: Array<{ action: string; at: number; actorId: string; details: unknown }>;
};
export type CalendarConfigureInput = {
  timezone?: string;
  day?: Weekday;
  hours?: DailyHours;
  override?: ScheduleOverride;
  package?: Omit<TicketPackage, "id" | "version" | "active"> & { id?: string };
};
