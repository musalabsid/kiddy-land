import { readVenueSettings, writeVenueSettings } from "./database.ts";
import type { LocalDatabase } from "./database.ts";

export type BackupInterval = "off" | "6h" | "12h" | "daily" | "weekly";
export type VenueTheme = "monochrome" | "emerald" | "pastel" | "sunset" | "ocean";
export type VenueSettings = {
  venueName: string;
  logoUrl: string | null; // data URL or null
  backupInterval: BackupInterval;
  theme: VenueTheme;
};

const DEFAULTS: VenueSettings = {
  venueName: "Kiddy Land",
  logoUrl: null,
  backupInterval: "daily",
  theme: "monochrome",
};

const VALID_INTERVALS: BackupInterval[] = ["off", "6h", "12h", "daily", "weekly"];
const VALID_THEMES: VenueTheme[] = ["monochrome", "emerald", "pastel", "sunset", "ocean"];

export function createVenueSettingsStore(database: LocalDatabase) {
  const get = (): VenueSettings => {
    const raw = readVenueSettings(database);
    if (!raw) return { ...DEFAULTS };
    return {
      venueName: typeof raw.venueName === "string" && raw.venueName.trim() ? raw.venueName.trim().slice(0, 32) : DEFAULTS.venueName,
      logoUrl: typeof raw.logoUrl === "string" && raw.logoUrl.startsWith("data:image/") ? raw.logoUrl.slice(0, 500_000) : null,
      backupInterval: VALID_INTERVALS.includes(raw.backupInterval as BackupInterval) ? (raw.backupInterval as BackupInterval) : DEFAULTS.backupInterval,
      theme: VALID_THEMES.includes(raw.theme as VenueTheme) ? (raw.theme as VenueTheme) : DEFAULTS.theme,
    };
  };
  const update = (patch: Partial<VenueSettings>): VenueSettings => {
    const current = get();
    const next: VenueSettings = {
      venueName: patch.venueName !== undefined ? String(patch.venueName).trim().slice(0, 32) || current.venueName : current.venueName,
      logoUrl: patch.logoUrl !== undefined ? (patch.logoUrl && String(patch.logoUrl).startsWith("data:image/") ? String(patch.logoUrl).slice(0, 500_000) : null) : current.logoUrl,
      backupInterval: patch.backupInterval !== undefined && VALID_INTERVALS.includes(patch.backupInterval as BackupInterval) ? (patch.backupInterval as BackupInterval) : current.backupInterval,
      theme: patch.theme !== undefined && VALID_THEMES.includes(patch.theme as VenueTheme) ? (patch.theme as VenueTheme) : current.theme,
    };
    if (!next.venueName.trim()) throw new Error("Venue name is required");
    writeVenueSettings(database, next);
    return next;
  };
  return { get, update, defaults: () => ({ ...DEFAULTS }) };
}
export type VenueSettingsStore = ReturnType<typeof createVenueSettingsStore>;
