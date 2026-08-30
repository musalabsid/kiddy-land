import * as React from "react";
import { useVenueSettings, useUpdateVenueSettings, type BackupInterval, type VenueTheme } from "@kiddy-land/client";
import { useTheme } from "@workspace/ui/providers/theme-provider";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select } from "@workspace/ui/components/select";
import { LoaderCircle, Upload, Image as ImageIcon } from "lucide-react";
import { useLocale, type MessageKey } from "@workspace/ui/lib/i18n";

const THEMES: { value: VenueTheme; labelKey: MessageKey; descKey: MessageKey; swatch: string }[] = [
  { value: "monochrome", labelKey: "customization.themeMonochrome", descKey: "customization.themeMonochromeDesc", swatch: "bg-foreground" },
  { value: "emerald", labelKey: "customization.themeEmerald", descKey: "customization.themeEmeraldDesc", swatch: "bg-emerald-600" },
  { value: "pastel", labelKey: "customization.themePastel", descKey: "customization.themePastelDesc", swatch: "bg-pink-400" },
  { value: "sunset", labelKey: "customization.themeSunset", descKey: "customization.themeSunsetDesc", swatch: "bg-amber-500" },
  { value: "ocean", labelKey: "customization.themeOcean", descKey: "customization.themeOceanDesc", swatch: "bg-blue-600" },
];
const INTERVALS: { value: BackupInterval; labelKey: MessageKey }[] = [
  { value: "off", labelKey: "customization.intervalOff" },
  { value: "6h", labelKey: "customization.interval6h" },
  { value: "12h", labelKey: "customization.interval12h" },
  { value: "daily", labelKey: "customization.intervalDaily" },
  { value: "weekly", labelKey: "customization.intervalWeekly" },
];

export function VenueCustomization() {
  const { t } = useLocale();
  const { data, isLoading } = useVenueSettings();
  const update = useUpdateVenueSettings();
  const { venueTheme, setVenueTheme } = useTheme();
  const [venueName, setVenueName] = React.useState("");
  const [backupInterval, setBackupInterval] = React.useState<BackupInterval>("daily");
  const [theme, setTheme] = React.useState<VenueTheme>("monochrome");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data) return;
    setVenueName(data.venueName);
    setBackupInterval(data.backupInterval);
    setTheme(data.theme);
    setLogoUrl(data.logoUrl);
    setLogoPreview(data.logoUrl);
  }, [data]);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400_000) { alert(t("customization.logoTooLarge")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (!result.startsWith("data:image/")) return;
      setLogoPreview(result);
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    try {
      const next = await update.mutateAsync({ venueName: venueName.trim() || "Kiddy Land", backupInterval, theme, logoUrl });
      setVenueTheme(next.theme as VenueTheme);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("customization.saveFailed"));
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" /> Loading…</div>;

  const dirty = data ? (data.venueName !== venueName || data.backupInterval !== backupInterval || data.theme !== theme || data.logoUrl !== logoUrl) : true;

  return (
    <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("customization.eyebrow")}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{t("customization.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("customization.subtitle")}</p>
      </header>
      <div className="space-y-6">

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("customization.venueTitle")}</CardTitle>
            <CardDescription>{t("customization.venueDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("customization.venueName")}</label>
              <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Kiddy Land" maxLength={32} />
              <p className="text-xs text-muted-foreground tabular-nums">{venueName.length}/32</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("customization.logo")}</label>
              <div className="flex items-center gap-4">
                <div className="size-20 shrink-0 overflow-hidden border bg-muted flex items-center justify-center">
                  {logoPreview ? <img src={logoPreview} alt="logo" className="size-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" />}
                </div>
                <div className="grid gap-2">
                  <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} className="w-[220px]" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}><Upload className="size-4" /> {t("customization.upload")}</Button>
                    {logoPreview ? <Button variant="ghost" size="sm" onClick={() => { setLogoPreview(null); setLogoUrl(null); }}>{t("customization.remove")}</Button> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("customization.logoHint")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("customization.backupTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("customization.backupDescription")}</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t("customization.interval")}</label>
              <Select value={backupInterval} onChange={(e) => setBackupInterval(e.target.value as BackupInterval)}>
                {INTERVALS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </Select>
              <p className="text-xs text-muted-foreground">Current page shows “Auto backup: {backupInterval}, keep 10”.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("customization.themesTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("customization.themesDescription")} <span className="font-mono text-xs">data-theme</span> + <span className="font-mono text-xs">D</span>.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {THEMES.map((th) => { return (
              <button
                key={th.value}
                type="button"
                onClick={() => { setTheme(th.value); setVenueTheme(th.value); }}
                className={`rounded border p-3 text-left transition ${theme === th.value ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-foreground/20"}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`size-6 rounded-full border ${th.swatch}`} aria-hidden />
                  <span className="text-sm font-medium">{t(th.labelKey)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t(th.descKey)}</p>
                <p className={`mt-2 text-xs ${theme === th.value ? "text-primary font-medium" : "text-muted-foreground"}`}>{theme === th.value ? t("customization.selected") : venueTheme === th.value ? t("customization.active") : ""}</p>
              </button>
            );})}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={!dirty || update.isPending}>{update.isPending ? <><LoaderCircle className="size-4 animate-spin" /> {t("customization.saving")}</> : t("customization.save")}</Button>
            <span className="text-xs text-muted-foreground">{t("customization.saveHint")}</span>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
