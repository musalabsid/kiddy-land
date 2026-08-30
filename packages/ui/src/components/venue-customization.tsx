import * as React from "react";
import { useVenueSettings, useUpdateVenueSettings, type BackupInterval, type VenueTheme } from "@kiddy-land/client";
import { useTheme } from "@workspace/ui/providers/theme-provider";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select } from "@workspace/ui/components/select";
import { LoaderCircle, Upload, Image as ImageIcon } from "lucide-react";

const THEMES: { value: VenueTheme; label: string; desc: string; swatch: string }[] = [
  { value: "monochrome", label: "Monochrome", desc: "Current · ink + paper", swatch: "bg-foreground" },
  { value: "emerald", label: "Emerald", desc: "Teal · calm play", swatch: "bg-emerald-600" },
  { value: "pastel", label: "Pastel", desc: "Soft pink · friendly", swatch: "bg-pink-400" },
  { value: "sunset", label: "Sunset", desc: "Amber · warm", swatch: "bg-amber-500" },
  { value: "ocean", label: "Ocean", desc: "Blue · deep trust", swatch: "bg-blue-600" },
];
const INTERVALS: { value: BackupInterval; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "6h", label: "Every 6 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export function VenueCustomization() {
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
    if (file.size > 400_000) { alert("Logo too large — max ~400KB, use 512×512 PNG/JPG"); return; }
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
      alert(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" /> Loading…</div>;

  const dirty = data ? (data.venueName !== venueName || data.backupInterval !== backupInterval || data.theme !== theme || data.logoUrl !== logoUrl) : true;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customization</h1>
        <p className="text-sm text-muted-foreground">Venue name, logo, backup schedule and theme. Owner only.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Venue</CardTitle>
            <CardDescription>Shown in header, kiosk and reports. Default is Kiddy Land.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Venue name</label>
              <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Kiddy Land" maxLength={32} />
              <p className="text-xs text-muted-foreground tabular-nums">{venueName.length}/32</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Logo</label>
              <div className="flex items-center gap-4">
                <div className="size-20 shrink-0 overflow-hidden border bg-muted flex items-center justify-center">
                  {logoPreview ? <img src={logoPreview} alt="logo" className="size-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" />}
                </div>
                <div className="grid gap-2">
                  <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} className="w-[220px]" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}><Upload className="size-4" /> Upload</Button>
                    {logoPreview ? <Button variant="ghost" size="sm" onClick={() => { setLogoPreview(null); setLogoUrl(null); }}>Remove</Button> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">512×512 PNG recommended — stored as data URL…</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup schedule</CardTitle>
            <p className="text-sm text-muted-foreground">Auto backup interval. Keep 10 latest.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Interval</label>
              <Select value={backupInterval} onChange={(e) => setBackupInterval(e.target.value as BackupInterval)}>
                {INTERVALS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <p className="text-xs text-muted-foreground">Current page shows “Auto backup: {backupInterval}, keep 10”.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <p className="text-sm text-muted-foreground">5 brand palettes — monochrome is current. <span className="font-mono text-xs">data-theme</span> + <span className="font-mono text-xs">D</span> for dark.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {THEMES.map((t) => { const span = t.value === "monochrome" ? "md:col-span-2" : t.value === "ocean" ? "md:col-span-2" : "md:col-span-1"; return (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTheme(t.value); setVenueTheme(t.value); }}
                className={`rounded border p-3 text-left transition ${span} ${theme === t.value ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-foreground/20"}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`size-6 rounded-full border ${t.swatch}`} aria-hidden />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                <p className={`mt-2 text-xs ${theme === t.value ? "text-primary font-medium" : "text-muted-foreground"}`}>{theme === t.value ? "Selected" : venueTheme === t.value ? "Active" : ""}</p>
              </button>
            );})}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={!dirty || update.isPending}>{update.isPending ? <><LoaderCircle className="size-4 animate-spin" /> Saving…</> : "Save changes"}</Button>
            <span className="text-xs text-muted-foreground">Preview updates locally on save. Revert by picking Monochrome.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
