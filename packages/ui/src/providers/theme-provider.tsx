/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";
type ThemeProviderProps = { children: React.ReactNode; defaultTheme?: Theme; storageKey?: string; disableTransitionOnChange?: boolean };
type ThemeProviderState = { theme: Theme; setTheme: (theme: Theme) => void };
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
  React.useEffect(() => { applyTheme(theme); if (theme !== "system") return undefined; const media = window.matchMedia(COLOR_SCHEME_QUERY); const onChange = () => applyTheme("system"); media.addEventListener("change", onChange); return () => media.removeEventListener("change", onChange); }, [theme]);
  React.useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (!event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "d" && !isEditableTarget(event.target)) setTheme(theme === "dark" ? "light" : "dark"); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [theme, setTheme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = React.useContext(ThemeContext); if (!value) throw new Error("useTheme must be used within a ThemeProvider"); return value; }
