import {
  useVenueSettings,
  useUpdateVenueSettings,
  type BackupInterval,
  type VenueTheme,
} from "@kiddy-land/client";
import { useChangePasswordMutation } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Select } from "@workspace/ui/components/select";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import { useLocale, type MessageKey } from "@workspace/ui/lib/i18n";
import { useTheme } from "@workspace/ui/providers/theme-provider";
import {
  LoaderCircle,
  Upload,
  Image as ImageIcon,
  Bell,
  KeyRound,
  ShoppingCart,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

const THEMES: {
  value: VenueTheme;
  labelKey: MessageKey;
  descKey: MessageKey;
  swatch: string;
}[] = [
  {
    value: "monochrome",
    labelKey: "customization.themeMonochrome",
    descKey: "customization.themeMonochromeDesc",
    swatch: "bg-foreground",
  },
  {
    value: "emerald",
    labelKey: "customization.themeEmerald",
    descKey: "customization.themeEmeraldDesc",
    swatch: "bg-emerald-600",
  },
  {
    value: "pastel",
    labelKey: "customization.themePastel",
    descKey: "customization.themePastelDesc",
    swatch: "bg-pink-400",
  },
  {
    value: "violet",
    labelKey: "customization.themeViolet",
    descKey: "customization.themeVioletDesc",
    swatch: "bg-violet-500",
  },
  {
    value: "ocean",
    labelKey: "customization.themeOcean",
    descKey: "customization.themeOceanDesc",
    swatch: "bg-blue-600",
  },
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
  const [backupInterval, setBackupInterval] =
    React.useState<BackupInterval>("daily");
  const [theme, setTheme] = React.useState<VenueTheme>("monochrome");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [alertEnabled, setAlertEnabled] = React.useState(false);
  const [alertThreshold, setAlertThreshold] = React.useState(5);
  const [alertDevices, setAlertDevices] = React.useState<
    Array<"Owner" | "Cashier" | "Kiosk">
  >(["Cashier", "Kiosk"]);
  const [nameCalling, setNameCalling] = React.useState(false);
  const [bulkTicketEnabled, setBulkTicketEnabled] = React.useState(true);
  const [maxTicketsPerSale, setMaxTicketsPerSale] = React.useState(12);
  const [alertTextDefault, setAlertTextDefault] = React.useState(
    "Tiket nomor {number}, waktu bermain tinggal {duration} menit lagi.",
  );
  const [alertTextName, setAlertTextName] = React.useState(
    "Anak {name}, waktu bermain tinggal {duration} menit lagi.",
  );
  const [alertEndedEnabled, setAlertEndedEnabled] = React.useState(false);
  const [alertEndedTextDefault, setAlertEndedTextDefault] = React.useState(
    "Waktu bermain habis untuk tiket {number}.",
  );
  const [alertEndedTextName, setAlertEndedTextName] = React.useState(
    "Waktu bermain habis untuk {name}.",
  );
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const changePassword = useChangePasswordMutation();
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    if (!data) return;
    // Sync from server only once on first load; subsequent refetches must not
    // stomp unsaved edits (refetchOnWindowFocus, background invalidation).
    if (loadedRef.current) return;
    loadedRef.current = true;
    setVenueName(data.venueName);
    setBackupInterval(data.backupInterval);
    setTheme(data.theme);
    setLogoUrl(data.logoUrl);
    setLogoPreview(data.logoUrl);
    setAlertEnabled((data as any).alertEnabled ?? false);
    setAlertThreshold((data as any).alertThreshold ?? 5);
    setAlertDevices((data as any).alertDevices ?? ["Cashier", "Kiosk"]);
    setNameCalling((data as any).nameCalling ?? false);
    setBulkTicketEnabled((data as any).bulkTicketEnabled ?? true);
    setMaxTicketsPerSale((data as any).maxTicketsPerSale ?? 12);
    setAlertTextDefault(
      (data as any).alertTextDefault ??
        "Tiket nomor {number}, waktu bermain tinggal {duration} menit lagi.",
    );
    setAlertTextName(
      (data as any).alertTextName ??
        "Anak {name}, waktu bermain tinggal {duration} menit lagi.",
    );
    setAlertEndedEnabled((data as any).alertEndedEnabled ?? false);
    setAlertEndedTextDefault(
      (data as any).alertEndedTextDefault ??
        "Waktu bermain habis untuk tiket {number}.",
    );
    setAlertEndedTextName(
      (data as any).alertEndedTextName ?? "Waktu bermain habis untuk {name}.",
    );
  }, [data]);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400_000) {
      alert(t("customization.logoTooLarge"));
      return;
    }
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
      const def = alertTextDefault.trim();
      const name = alertTextName.trim();
      if (!def.includes("{duration}") || !def.includes("{number}")) {
        alert(t("customization.alertTextInvalidDefault"));
        return;
      }
      if (!name.includes("{duration}") || !name.includes("{name}")) {
        alert(t("customization.alertTextInvalidName"));
        return;
      }
      const endedDef = alertEndedTextDefault.trim();
      const endedName = alertEndedTextName.trim();
      if (
        (!endedDef.includes("{number}") && !endedDef.includes("{name}")) ||
        (!endedName.includes("{number}") && !endedName.includes("{name}"))
      ) {
        alert(t("customization.alertEndedTextInvalid"));
        return;
      }
      const next = await update.mutateAsync({
        venueName: venueName.trim() || "Kiddy Land",
        backupInterval,
        theme,
        logoUrl,
        alertEnabled,
        alertThreshold,
        alertDevices,
        nameCalling,
        bulkTicketEnabled,
        maxTicketsPerSale,
        alertTextDefault: def,
        alertTextName: name,
        alertEndedEnabled,
        alertEndedTextDefault: alertEndedTextDefault.trim(),
        alertEndedTextName: alertEndedTextName.trim(),
      } as any);
      setVenueTheme(next.theme as VenueTheme);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("customization.saveFailed"));
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" /> Loading…
      </div>
    );

  const dirty = data
    ? data.venueName !== venueName ||
      data.backupInterval !== backupInterval ||
      data.theme !== theme ||
      data.logoUrl !== logoUrl ||
      (data as any).alertEnabled !== alertEnabled ||
      (data as any).alertThreshold !== alertThreshold ||
      JSON.stringify((data as any).alertDevices) !==
        JSON.stringify(alertDevices) ||
      (data as any).nameCalling !== nameCalling ||
      (data as any).bulkTicketEnabled !== bulkTicketEnabled ||
      (data as any).maxTicketsPerSale !== maxTicketsPerSale ||
      (data as any).alertTextDefault !== alertTextDefault ||
      (data as any).alertTextName !== alertTextName ||
      (data as any).alertEndedEnabled !== alertEndedEnabled ||
      (data as any).alertEndedTextDefault !== alertEndedTextDefault ||
      (data as any).alertEndedTextName !== alertEndedTextName
    : true;

  return (
    <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-4">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {t("settings.eyebrow") ?? t("customization.eyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("settings.title") ?? t("customization.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("settings.subtitle") ?? t("customization.subtitle")}
        </p>
      </header>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("customization.venueTitle")}</CardTitle>
              <CardDescription>
                {t("customization.venueDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t("customization.venueName")}
                </label>
                <Input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Kiddy Land"
                  maxLength={32}
                />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {venueName.length}/32
                </p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t("customization.logo")}
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden border bg-muted">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="logo"
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={onLogoChange}
                      className="w-[220px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document
                            .querySelector<HTMLInputElement>(
                              'input[type="file"]',
                            )
                            ?.click()
                        }
                      >
                        <Upload className="size-4" />{" "}
                        {t("customization.upload")}
                      </Button>
                      {logoPreview ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLogoPreview(null);
                            setLogoUrl(null);
                          }}
                        >
                          {t("customization.remove")}
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("customization.logoHint")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("customization.backupTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("customization.backupDescription")}
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t("customization.interval")}
                </label>
                <Select
                  value={backupInterval}
                  onChange={(e) =>
                    setBackupInterval(e.target.value as BackupInterval)
                  }
                >
                  {INTERVALS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current page shows “Auto backup: {backupInterval}, keep 10”.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" /> {t("customization.alertTitle")}
            </CardTitle>
            <CardDescription>
              {t("customization.alertDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 border p-4">
              <p className="text-sm font-semibold">
                {t("customization.alertGlobalTitle")}
              </p>
              <div className="grid gap-3">
                <label className="text-sm font-medium">
                  {t("customization.alertDevices")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["Owner", "Cashier", "Kiosk"] as const).map((dev) => (
                    <label
                      key={dev}
                      className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={alertDevices.includes(dev)}
                        onChange={(e) =>
                          setAlertDevices((prev) =>
                            e.target.checked
                              ? [...prev, dev]
                              : prev.filter((d) => d !== dev),
                          )
                        }
                      />
                      {dev}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("customization.alertDevicesHint")}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {t("customization.nameCalling")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("customization.nameCallingDescription")}
                  </p>
                </div>
                <Switch
                  checked={nameCalling}
                  onCheckedChange={setNameCalling}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {t("customization.enableAlert")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("customization.enableAlertDescription")}
                </p>
              </div>
              <Switch
                checked={alertEnabled}
                onCheckedChange={setAlertEnabled}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("customization.threshold").replace(
                  "{n}",
                  String(alertThreshold),
                )}
              </label>
              <Slider
                value={[alertThreshold]}
                min={3}
                max={10}
                step={1}
                onValueChange={(v: any) =>
                  setAlertThreshold(Array.isArray(v) ? (v[0] ?? 5) : (v ?? 5))
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("customization.alertTextDefaultLabel")}
              </label>
              <Input
                value={alertTextDefault}
                onChange={(e) => setAlertTextDefault(e.target.value)}
                maxLength={200}
                placeholder={
                  "Tiket nomor {number}, waktu bermain tinggal {duration} menit lagi."
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("customization.alertTextHint")}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("customization.alertTextNameLabel")}
              </label>
              <Input
                value={alertTextName}
                onChange={(e) => setAlertTextName(e.target.value)}
                maxLength={200}
                placeholder={
                  "Anak {name}, waktu bermain tinggal {duration} menit lagi."
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("customization.alertTextHint")}
              </p>
            </div>
            <div className="border-t pt-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {t("customization.alertEndedTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("customization.alertEndedDescription")}
                  </p>
                </div>
                <Switch
                  checked={alertEndedEnabled}
                  onCheckedChange={setAlertEndedEnabled}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t("customization.alertTextDefaultLabel")}
                </label>
                <Input
                  value={alertEndedTextDefault}
                  onChange={(e) => setAlertEndedTextDefault(e.target.value)}
                  maxLength={200}
                  placeholder={"Waktu bermain habis untuk tiket {number}."}
                />
                <p className="text-xs text-muted-foreground">
                  {t("customization.alertEndedTextHint")}
                </p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t("customization.alertTextNameLabel")}
                </label>
                <Input
                  value={alertEndedTextName}
                  onChange={(e) => setAlertEndedTextName(e.target.value)}
                  maxLength={200}
                  placeholder={"Waktu bermain habis untuk {name}."}
                />
                <p className="text-xs text-muted-foreground">
                  {t("customization.alertEndedTextHint")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              {t("customization.bulkTitle")}
            </CardTitle>
            <CardDescription>
              {t("customization.bulkDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {t("customization.bulkEnable")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("customization.bulkEnableDescription")}
                </p>
              </div>
              <Switch
                checked={bulkTicketEnabled}
                onCheckedChange={setBulkTicketEnabled}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("customization.maxTickets").replace(
                  "{n}",
                  String(maxTicketsPerSale),
                )}
              </label>
              <Slider
                value={[maxTicketsPerSale]}
                min={2}
                max={12}
                step={1}
                onValueChange={(v: any) =>
                  setMaxTicketsPerSale(
                    Array.isArray(v) ? (v[0] ?? 12) : (v ?? 12),
                  )
                }
                disabled={!bulkTicketEnabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />{" "}
              {t("settings.passwordTitle") ?? "Change owner password"}
            </CardTitle>
            <CardDescription>
              {t("settings.passwordDescription") ??
                "Update the owner login password (min 8 characters)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("settings.currentPassword") ?? "Current password"}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("settings.newPassword") ?? "New password"}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t("settings.confirmPassword") ?? "Confirm new password"}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              disabled={
                !currentPassword ||
                !newPassword ||
                newPassword !== confirmPassword ||
                changePassword.isPending
              }
              onClick={async () => {
                try {
                  await changePassword.mutateAsync({
                    currentPassword,
                    newPassword,
                  });
                  toast.success(
                    t("settings.passwordChanged") ?? "Password changed",
                  );
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              {changePassword.isPending
                ? (t("settings.changing") ?? "Changing...")
                : (t("settings.changePassword") ?? "Change password")}
            </Button>
            {newPassword &&
            confirmPassword &&
            newPassword !== confirmPassword ? (
              <p className="text-xs text-destructive">
                {t("settings.passwordMismatch") ?? "Passwords do not match"}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("customization.themesTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("customization.themesDescription")}{" "}
              <span className="font-mono text-xs">data-theme</span> +{" "}
              <span className="font-mono text-xs">D</span>.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {THEMES.map((th) => {
                return (
                  <button
                    key={th.value}
                    type="button"
                    onClick={() => {
                      setTheme(th.value);
                      setVenueTheme(th.value);
                    }}
                    className={`rounded border p-3 text-left transition ${theme === th.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-foreground/20"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-6 rounded-full border ${th.swatch}`}
                        aria-hidden
                      />
                      <span className="text-sm font-medium">
                        {t(th.labelKey)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(th.descKey)}
                    </p>
                    <p
                      className={`mt-2 text-xs ${theme === th.value ? "font-medium text-primary" : "text-muted-foreground"}`}
                    >
                      {theme === th.value
                        ? t("customization.selected")
                        : venueTheme === th.value
                          ? t("customization.active")
                          : ""}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onSave} disabled={!dirty || update.isPending}>
                {update.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />{" "}
                    {t("customization.saving")}
                  </>
                ) : (
                  t("customization.save")
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("customization.saveHint")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
