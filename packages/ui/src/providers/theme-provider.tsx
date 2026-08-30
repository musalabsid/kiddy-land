/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

type Theme = "dark" | "light" | "system";
export type VenueTheme = "monochrome" | "emerald" | "pastel" | "sunset" | "ocean";
const VENUE_THEMES: VenueTheme[] = ["monochrome", "emerald", "pastel", "sunset", "ocean"];
function isVenueTheme(v: string | null): v is VenueTheme { return v !== null && (VENUE_THEMES as string[]).includes(v); }
function applyVenueTheme(v: VenueTheme) { document.documentElement.setAttribute("data-theme", v); }
type ResolvedTheme = "dark" | "light";
type ThemeProviderProps = { children: React.ReactNode; defaultTheme?: Theme; storageKey?: string; disableTransitionOnChange?: boolean };
type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void; venueTheme: VenueTheme; setVenueTheme: (v: VenueTheme) => void };
const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_VALUES: Theme[] = ["dark", "light", "system"];
const ThemeContext = React.createContext<ThemeProviderState | undefined>(undefined);
function isTheme(value: string | null): value is Theme { return value !== null && THEME_VALUES.includes(value as Theme); }
function getSystemTheme(): ResolvedTheme { return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light"; }
function isEditableTarget(target: EventTarget | null) { return target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable='true']"))); }
function applyTheme(theme: Theme) { const root = document.documentElement; root.classList.remove("light", "dark"); root.classList.add(theme === "system" ? getSystemTheme() : theme); }

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "theme" }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => { if (typeof window === "undefined") return defaultTheme; const stored = window.localStorage.getItem(storageKey); return isTheme(stored) ? stored : defaultTheme; });
  const setTheme = React.useCallback((next: Theme) => { window.localStorage.setItem(storageKey, next); setThemeState(next); }, [storageKey]);
  const [venueTheme, setVenueThemeState] = React.useState<VenueTheme>(() => { if (typeof window === "undefined") return "monochrome"; const stored = window.localStorage.getItem("venue-theme"); return isVenueTheme(stored) ? stored : "monochrome"; });
  const setVenueTheme = React.useCallback((next: VenueTheme) => { window.localStorage.setItem("venue-theme", next); setVenueThemeState(next); applyVenueTheme(next); }, []);
  React.useEffect(() => { applyTheme(theme); if (theme !== "system") return undefined; const media = window.matchMedia(COLOR_SCHEME_QUERY); const onChange = () => applyTheme("system"); media.addEventListener("change", onChange); return () => media.removeEventListener("change", onChange); }, [theme]);
  React.useEffect(() => { applyVenueTheme(venueTheme); }, [venueTheme]);
  React.useEffect(() => { const initial = document.documentElement.getAttribute("data-theme") ?? venueTheme; const id = setTimeout(() => { if ((document.documentElement.getAttribute("data-theme") ?? venueTheme) !== initial) return; fetch("/public/venue").then(r => r.json()).then((d: { theme?: string }) => { if (d?.theme && isVenueTheme(d.theme)) { const current = document.documentElement.getAttribute("data-theme") ?? venueTheme; if (current !== initial) return; setVenueThemeState(d.theme as VenueTheme); applyVenueTheme(d.theme as VenueTheme); window.localStorage.setItem("venue-theme", d.theme); } }).catch(() => {}); }, 300); return () => clearTimeout(id); }, []);
  React.useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (!event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "d" && !isEditableTarget(event.target)) setTheme(theme === "dark" ? "light" : "dark"); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [theme, setTheme]);
  return <ThemeContext.Provider value={{ theme, setTheme, venueTheme, setVenueTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = React.useContext(ThemeContext); if (!value) throw new Error("useTheme must be used within a ThemeProvider"); return value; }
