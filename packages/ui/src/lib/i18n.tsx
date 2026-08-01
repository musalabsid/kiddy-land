import * as React from "react";

export type Locale = "id" | "en";
export const DEFAULT_LOCALE: Locale = "id";

const messages = {
  id: {
    "host.eyebrow": "KIDDY LAND / HOST",
    "host.title": "Pusat operasi lokal",
    "host.subtitle": "Satu host venue. Satu Local Server sebagai sumber kebenaran. Tanpa Internet.",
    "host.readiness": "Kesiapan host",
    "host.readinessDescription": "Status diagnostik yang aman untuk petugas venue",
    "host.ready": "Local Server siap untuk operasi lokal",
    "host.readyDescription": "Host dapat menerima koneksi klien lokal.",
    "host.notReadyDescription": "Perubahan dinonaktifkan sampai kesiapan dikonfirmasi.",
    "host.starting": "Local Server sedang dimulai",
    "host.unhealthy": "Local Server tidak tersedia",
    "host.fatal": "Local Server gagal dimulai",
    "host.startingAction": "Memeriksa Local Server…",
    "host.unhealthyAction": "Mulai ulang host atau hubungi administrator.",
    "host.check": "Periksa lagi",
    "host.localFirst": "Lokal terlebih dahulu",
    "host.localFirstDescription": "Data operasional tetap berada di host venue.",
    "host.offline": "Siap offline",
    "host.offlineDescription": "Kehilangan Internet tidak membuat transaksi mengantre.",
    "host.authoritative": "Sumber kebenaran",
    "host.authoritativeDescription": "Setiap klien membaca status server sebelum menulis.",
    "host.serverOrigin": "Origin server",
    "host.database": "Database",
    "host.unknown": "tidak diketahui",
    "host.stop": "Hentikan Local Server",
    "host.stopUnavailable": "Local Server tidak tersedia",
    "language.label": "Bahasa",
    "language.id": "Bahasa Indonesia",
    "language.en": "English",
  },
  en: {
    "host.eyebrow": "KIDDY LAND / HOST",
    "host.title": "Local operation center",
    "host.subtitle": "One venue host. One authoritative Local Server. No Internet required.",
    "host.readiness": "Host readiness",
    "host.readinessDescription": "Safe diagnostic state for venue staff",
    "host.ready": "Local Server ready for local operation",
    "host.readyDescription": "The host can accept local client connections.",
    "host.notReadyDescription": "Mutations remain unavailable until readiness is confirmed.",
    "host.starting": "Local Server is starting",
    "host.unhealthy": "Local Server is unavailable",
    "host.fatal": "Local Server failed to start",
    "host.startingAction": "Checking Local Server…",
    "host.unhealthyAction": "Restart the host or contact an administrator.",
    "host.check": "Check again",
    "host.localFirst": "Local first",
    "host.localFirstDescription": "Operational data stays on the venue host.",
    "host.offline": "Offline ready",
    "host.offlineDescription": "Internet loss does not queue transactions.",
    "host.authoritative": "Authoritative",
    "host.authoritativeDescription": "Every client reads server readiness first.",
    "host.serverOrigin": "Server origin",
    "host.database": "Database",
    "host.unknown": "unknown",
    "host.stop": "Stop Local Server",
    "host.stopUnavailable": "Local Server is unavailable",
    "language.label": "Language",
    "language.id": "Bahasa Indonesia",
    "language.en": "English",
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export type Translate = (key: MessageKey) => string;

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: Translate };
const LocaleContext = React.createContext<LocaleContextValue | undefined>(undefined);

function isLocale(value: string | null): value is Locale { return value === "id" || value === "en"; }

export function LocaleProvider({ children, defaultLocale = DEFAULT_LOCALE, storageKey = "kiddy-land-locale" }: { children: React.ReactNode; defaultLocale?: Locale; storageKey?: string }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    const stored = window.localStorage.getItem(storageKey);
    return isLocale(stored) ? stored : defaultLocale;
  });
  const setLocale = React.useCallback((next: Locale) => { setLocaleState(next); window.localStorage.setItem(storageKey, next); }, [storageKey]);
  const t = React.useCallback<Translate>((key) => messages[locale][key], [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = React.useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export function formatIdr(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: Date | number | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
