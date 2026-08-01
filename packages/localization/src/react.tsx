import * as React from "react";
import { DEFAULT_LOCALE, isLocale, translate, type Locale, type Translate } from "./index";
export type { Locale, MessageKey, Translate } from "./index";
export { DEFAULT_LOCALE, formatDate, formatIdr, isLocale, messages, translate } from "./index";

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: Translate };
const LocaleContext = React.createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children, defaultLocale = DEFAULT_LOCALE, storageKey = "kiddy-land-locale" }: { children: React.ReactNode; defaultLocale?: Locale; storageKey?: string }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    const stored = window.localStorage.getItem(storageKey);
    return isLocale(stored) ? stored : defaultLocale;
  });
  const setLocale = React.useCallback((next: Locale) => { setLocaleState(next); window.localStorage.setItem(storageKey, next); }, [storageKey]);
  const t = React.useCallback<Translate>((key) => translate(locale, key), [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = React.useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
