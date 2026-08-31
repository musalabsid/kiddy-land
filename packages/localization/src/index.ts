import en from "../locales/en.json";
import id from "../locales/id.json";

export type Locale = "id" | "en";
export const DEFAULT_LOCALE: Locale = "id";
export const messages = { id, en } as const;
export type MessageKey = keyof typeof en;
export type Translate = (key: MessageKey) => string;

export function isLocale(value: string | null): value is Locale {
  return value === "id" || value === "en";
}
export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages[DEFAULT_LOCALE][key];
}
export function formatIdr(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
export function formatDate(value: Date | number | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
