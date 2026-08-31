import { readVenueSettings, writeVenueSettings } from "./database.ts";
import type { LocalDatabase } from "./database.ts";

export type BackupInterval = "off" | "6h" | "12h" | "daily" | "weekly";
export type VenueTheme =
  | "monochrome"
  | "emerald"
  | "pastel"
  | "violet"
  | "ocean";
export type VenueSettings = {
  venueName: string;
  logoUrl: string | null; // data URL or null
  backupInterval: BackupInterval;
  theme: VenueTheme;
  alertEnabled: boolean;
  alertThreshold: number; // 3-10 default 5
  alertDevices: Array<"Owner" | "Cashier" | "Kiosk">;
};

const DEFAULTS: VenueSettings = {
  venueName: "Kiddy Land",
  logoUrl: null,
  backupInterval: "daily",
  theme: "monochrome",
  alertEnabled: false,
  alertThreshold: 5,
  alertDevices: ["Cashier", "Kiosk"],
};

const VALID_INTERVALS: BackupInterval[] = [
  "off",
  "6h",
  "12h",
  "daily",
  "weekly",
];
const VALID_THEMES: VenueTheme[] = [
  "monochrome",
  "emerald",
  "pastel",
  "violet",
  "ocean",
];

export function createVenueSettingsStore(database: LocalDatabase) {
  const get = (): VenueSettings => {
    const raw = readVenueSettings(database);
    if (!raw) return { ...DEFAULTS };
    const rawAlertDevices = Array.isArray((raw as any).alertDevices)
      ? (raw as any).alertDevices.filter((v: string) =>
          ["Owner", "Cashier", "Kiosk"].includes(v),
        )
      : DEFAULTS.alertDevices;
    return {
      venueName:
        typeof raw.venueName === "string" && raw.venueName.trim()
          ? raw.venueName.trim().slice(0, 32)
          : DEFAULTS.venueName,
      logoUrl:
        typeof raw.logoUrl === "string" && raw.logoUrl.startsWith("data:image/")
          ? raw.logoUrl
          : null,
      backupInterval: VALID_INTERVALS.includes(
        raw.backupInterval as BackupInterval,
      )
        ? (raw.backupInterval as BackupInterval)
        : DEFAULTS.backupInterval,
      theme: VALID_THEMES.includes(raw.theme as VenueTheme)
        ? (raw.theme as VenueTheme)
        : DEFAULTS.theme,
      alertEnabled:
        typeof (raw as any).alertEnabled === "boolean"
          ? (raw as any).alertEnabled
          : DEFAULTS.alertEnabled,
      alertThreshold:
        Number.isInteger((raw as any).alertThreshold) &&
        (raw as any).alertThreshold >= 3 &&
        (raw as any).alertThreshold <= 10
          ? (raw as any).alertThreshold
          : DEFAULTS.alertThreshold,
      alertDevices: rawAlertDevices.length
        ? rawAlertDevices
        : DEFAULTS.alertDevices,
    };
  };
  const update = (patch: Partial<VenueSettings>): VenueSettings => {
    const current = get();
    const alertThreshold =
      patch.alertThreshold !== undefined
        ? Number.isInteger(patch.alertThreshold) &&
          patch.alertThreshold >= 3 &&
          patch.alertThreshold <= 10
          ? patch.alertThreshold
          : (() => {
              throw new Error("Threshold must be 3-10");
            })()
        : current.alertThreshold;
    const alertDevices =
      patch.alertDevices !== undefined
        ? Array.isArray(patch.alertDevices)
          ? (patch.alertDevices.filter((v) =>
              ["Owner", "Cashier", "Kiosk"].includes(v as string),
            ) as VenueSettings["alertDevices"])
          : current.alertDevices
        : current.alertDevices;
    const next: VenueSettings = {
      venueName:
        patch.venueName !== undefined
          ? String(patch.venueName).trim().slice(0, 32) || current.venueName
          : current.venueName,
      logoUrl:
        patch.logoUrl !== undefined
          ? patch.logoUrl && String(patch.logoUrl).startsWith("data:image/")
            ? (() => {
                const v = String(patch.logoUrl);
                if (v.length > 550_000)
                  throw new Error("Logo too large — max ~400KB");
                return v;
              })()
            : null
          : current.logoUrl,
      backupInterval:
        patch.backupInterval !== undefined &&
        VALID_INTERVALS.includes(patch.backupInterval as BackupInterval)
          ? (patch.backupInterval as BackupInterval)
          : current.backupInterval,
      theme:
        patch.theme !== undefined &&
        VALID_THEMES.includes(patch.theme as VenueTheme)
          ? (patch.theme as VenueTheme)
          : current.theme,
      alertEnabled:
        patch.alertEnabled !== undefined
          ? Boolean(patch.alertEnabled)
          : current.alertEnabled,
      alertThreshold: alertThreshold,
      alertDevices: alertDevices.length ? alertDevices : current.alertDevices,
    };
    if (!next.venueName.trim()) throw new Error("Venue name is required");
    writeVenueSettings(database, next);
    return next;
  };
  return { get, update, defaults: () => ({ ...DEFAULTS }) };
}
export type VenueSettingsStore = ReturnType<typeof createVenueSettingsStore>;
