import { useOverview, type OverviewTicket } from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  useHostStatus,
  type HostState,
  type HostStatusSource,
} from "@workspace/ui/lib/host";
import { useLocale, type MessageKey } from "@workspace/ui/lib/i18n";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LoaderCircle,
  Package,
  PlugZap,
  RefreshCw,
  Server,
  ShoppingBag,
  Ticket,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
/* Hallmark · macrostructure: Workbench · theme: Lumen · nav: N5 · footer: Ft5 · genre: editorial */
import * as React from "react";

export function HostOverviewPage({
  source,
  origin,
  onStop,
  onStart,
}: {
  source: HostStatusSource;
  origin?: string;
  onStop?: () => Promise<void>;
  onStart?: () => Promise<void>;
}) {
  const { t, locale } = useLocale();
  const { status, checking, check } = useHostStatus(source);
  const overview = useOverview();
  const ready = status.state === "ready";
  const [stopOpen, setStopOpen] = React.useState(false);
  const [startOpen, setStartOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [depositInfoOpen, setDepositInfoOpen] = React.useState(false);
  React.useEffect(() => {
    (window as any).__depositInfo = () => setDepositInfoOpen(true);
    return () => {
      delete (window as any).__depositInfo;
    };
  }, []);
  const prevLanIp = React.useRef<string | undefined>(undefined);
  const [lanIpChanged, setLanIpChanged] = React.useState<{
    old?: string;
    cur?: string;
  } | null>(null);
  React.useEffect(() => {
    const cur = (status as unknown as { lanIp?: string }).lanIp;
    if (prevLanIp.current && cur && prevLanIp.current !== cur)
      setLanIpChanged({ old: prevLanIp.current, cur });
    if (cur) prevLanIp.current = cur;
    else if (status.state === "ready" && !cur) prevLanIp.current = undefined;
  }, [status]);
  const titleKey: MessageKey =
    status.state === "ready"
      ? "host.ready"
      : status.state === "fatal"
        ? "host.fatal"
        : status.state === "starting"
          ? "host.starting"
          : "host.unhealthy";

  const tickets = overview.data?.tickets ?? [];
  const live = overview.data?.live?.data;
  const generatedAt = overview.data?.generatedAt;
  const timezone = overview.data?.timezone;
  const operatingDate =
    tickets[0]?.operatingDate ??
    (generatedAt ? new Date(generatedAt).toISOString().slice(0, 10) : "");

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {
      waiting: 0,
      active: 0,
      completed: 0,
      "auto-closed": 0,
      expired: 0,
      void: 0,
    };
    for (const tk of tickets) c[tk.status] = (c[tk.status] ?? 0) + 1;
    return c;
  }, [tickets]);

  const filtered =
    statusFilter === "all"
      ? tickets
      : tickets.filter((tk) => tk.status === statusFilter);
  const refreshAll = React.useCallback(() => {
    void check();
    void overview.refetch();
  }, [check, overview]);

  return (
    <main className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <header className="mb-6">
          <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {t("overview.eyebrow")}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("overview.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {operatingDate
                  ? t("overview.subtitle").replace("{date}", operatingDate)
                  : t("host.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {generatedAt ? (
                <span>
                  {t("overview.generated")}{" "}
                  {new Date(generatedAt).toLocaleTimeString(
                    locale === "id" ? "id-ID" : "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  )}{" "}
                  · {timezone ?? ""}
                </span>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={refreshAll}
                disabled={overview.isFetching || checking}
              >
                <RefreshCw
                  className={cn(
                    "size-3.5",
                    (overview.isFetching || checking) && "animate-spin",
                  )}
                />
                {t("common.refresh")}
              </Button>
            </div>
          </div>
        </header>

        {lanIpChanged && (
          <Alert
            variant="destructive"
            className="mb-6 border-[var(--state-warning)]/40 bg-[var(--state-warning-bg)]/30 text-[var(--state-warning)]"
          >
            <AlertTriangle className="size-4" />
            <AlertTitle>
              {t("host.ipChangedTitle") ?? "Host IP changed"}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {`Was ${lanIpChanged.old} → now ${lanIpChanged.cur}. ${t("host.ipChangedDesc")}`}{" "}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLanIpChanged(null)}
              >
                {t("common.dismiss") ?? "Dismiss"}
              </Button>{" "}
              <Button size="sm" variant="outline" onClick={() => void check()}>
                <RefreshCw className="size-3" />{" "}
                {t("common.refresh") ?? "Refresh"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <div className="border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight">
                  {t("host.readiness")}
                </h2>
              </div>
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                <PlugZap className="size-3.5" />
                {t("host.database")}: {status.database ?? "—"}
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-3">
                <div className="flex gap-3">
                  <StatusIcon state={status.state} />
                  <div>
                    <p className="text-lg leading-none font-semibold">
                      {t(titleKey)}
                    </p>
                    <p className="mt-1 max-w-[36ch] text-sm leading-6 text-muted-foreground">
                      {ready
                        ? t("host.readyDescription")
                        : t("host.notReadyDescription")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void check()}
                    disabled={checking}
                  >
                    <RefreshCw
                      className={cn("size-3.5", checking && "animate-spin")}
                    />
                    {t("host.check")}
                  </Button>
                  {onStop && ready && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setStopOpen(true)}
                    >
                      {t("host.stop")}
                    </Button>
                  )}
                  {onStart && !ready && (
                    <Button size="sm" onClick={() => setStartOpen(true)}>
                      {t("host.start")}
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-5">
                <p className="font-semibold text-foreground">
                  {ready ? "Live on this host" : "Host paused"}
                </p>
                <p className="text-muted-foreground">
                  {ready
                    ? "Cashier, scanner and kiosk are connected to this origin. No internet needed."
                    : "Devices are offline. Start the host to reconnect cashier, scanner and kiosk on this LAN."}
                </p>
                <p className="font-mono text-[11px] break-all">
                  {(status as any).httpsUrl ??
                    status.origin ??
                    origin ??
                    t("host.stopUnavailable")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LiveCard
              icon={Users}
              label={t("reports.liveOccupancy")}
              value={live?.occupancy}
              loading={overview.isLoading}
              sub={t("reports.activeSessions")}
            />
            <LiveCard
              icon={Wallet}
              label={t("reports.activeMembers")}
              value={live?.activeMembers}
              loading={overview.isLoading}
              sub={t("reports.notDeactivated")}
            />
            <LiveCard
              icon={AlertTriangle}
              label={t("reports.lowStock")}
              value={live?.lowStock}
              loading={overview.isLoading}
              sub={t("reports.needsRestock")}
              tone={live && live.lowStock > 0 ? "destructive" : "default"}
            />
          </div>

          {live &&
          (live.salesTodayTotal !== undefined || live.sales !== undefined) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("overview.salesTodayTotal") ?? "Sales today (Rp)"}
                    </p>
                    {overview.isLoading ? (
                      <Skeleton className="mt-1 h-7 w-24" />
                    ) : (
                      <p className="text-3xl font-bold tracking-tight">
                        {new Intl.NumberFormat(
                          locale === "id" ? "id-ID" : "en-US",
                          { maximumFractionDigits: 0 },
                        ).format(live?.salesTodayTotal ?? 0)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {live?.ticketTodayTotal != null
                        ? `${locale === "id" ? "Tiket" : "Ticket"} ${new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(live.ticketTodayTotal)} · ${locale === "id" ? "Produk" : "Product"} ${new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(live.productTodayTotal ?? 0)}`
                        : operatingDate || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <LiveCard
                icon={ShoppingBag}
                label={t("overview.sales")}
                value={live.sales}
                loading={overview.isLoading}
                sub={operatingDate || "—"}
              />
            </div>
          ) : null}

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="size-4 text-primary" />
                  {t("overview.todayTickets")}
                </CardTitle>
                <CardDescription>
                  {tickets.length === 0
                    ? t("overview.ticketsEmptyHint")
                    : t("overview.ticketsDescription")
                        .replace("{count}", String(tickets.length))
                        .replace("{active}", String(counts.active ?? 0))
                        .replace("{waiting}", String(counts.waiting ?? 0))}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={refreshAll}
                  disabled={overview.isFetching}
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      overview.isFetching && "animate-spin",
                    )}
                  />
                  {t("common.refresh")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {overview.isLoading ? (
                <div className="grid gap-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : overview.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("reports.couldNotLoad")}</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center gap-2">
                    {t("reports.checkDates")}{" "}
                    <Button size="sm" variant="outline" onClick={refreshAll}>
                      {t("common.refresh")}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : tickets.length === 0 ? (
                <div className="grid place-items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
                  <Ticket className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {t("overview.noTickets")}
                  </p>
                  <p className="max-w-md text-xs leading-5 text-muted-foreground">
                    {t("overview.noTicketsHint")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ["all", t("overview.filterAll")],
                      ["active", t("overview.statusActive")],
                      ["waiting", t("overview.statusWaiting")],
                      ["completed", t("overview.statusCompleted")],
                      ["auto-closed", t("overview.statusAutoClosed")],
                      ["expired", t("overview.statusExpired")],
                      ["void", t("overview.statusVoid")],
                    ]
                      .filter(
                        ([key]) =>
                          key === "all" || (counts[key as string] ?? 0) > 0,
                      )
                      .map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setStatusFilter(key)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            statusFilter === key
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          {label}{" "}
                          {key !== "all"
                            ? `· ${counts[key] ?? 0}`
                            : `· ${tickets.length}`}
                        </button>
                      ))}
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
                          <th>{t("overview.code")}</th>
                          <th>{t("overview.child")}</th>
                          <th>{t("overview.package")}</th>
                          <th>{t("overview.status")}</th>
                          <th className="text-right">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />{" "}
                              {t("overview.playing")}
                            </span>
                          </th>
                          <th className="text-right">
                            {t("overview.remaining")}
                          </th>
                          <th className="text-right">
                            {t("overview.overtime")}
                          </th>
                          <th className="text-right">{t("overview.grace")}</th>
                          <th className="text-right">
                            <span className="inline-flex items-center gap-1">
                              {t("overview.deposit")}{" "}
                              <button
                                type="button"
                                onClick={() =>
                                  (window as any).__depositInfo?.()
                                }
                                className="inline-flex size-4 items-center justify-center rounded-full border text-[10px] leading-none hover:bg-muted"
                                aria-label="info"
                              >
                                !
                              </button>
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filtered.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-3 py-8 text-center text-sm text-muted-foreground"
                            >
                              {t("overview.noTickets")} · {statusFilter}
                            </td>
                          </tr>
                        ) : (
                          filtered.map((tk) => (
                            <TicketRow
                              key={tk.ticketId}
                              ticket={tk}
                              locale={locale}
                              t={t}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("overview.showing")
                      .replace("{shown}", String(filtered.length))
                      .replace("{total}", String(tickets.length))}
                    {operatingDate ? ` · ${operatingDate}` : ""}{" "}
                    {timezone ? `· ${timezone}` : ""}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={depositInfoOpen} onOpenChange={setDepositInfoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("overview.depositInfoTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="grid gap-2 text-left">
                <span>
                  <b>{t("overview.depositHeld")}:</b>{" "}
                  {t("overview.depositHeldDesc")}
                </span>
                <span>
                  <b>{t("overview.depositApplied")}:</b>{" "}
                  {t("overview.depositAppliedDesc")}
                </span>
                <span>
                  <b>{t("overview.depositRefunded")}:</b>{" "}
                  {t("overview.depositRefundedDesc")}
                </span>
                <span>
                  <b>{t("overview.depositForfeited")}:</b>{" "}
                  {t("overview.depositForfeitedDesc")}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setDepositInfoOpen(false)}>
                {t("common.close")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("host.stopConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("host.stopConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={async () => {
                  setStopOpen(false);
                  try {
                    await onStop?.();
                  } catch {}
                  setTimeout(() => void check(), 500);
                }}
              >
                {t("host.stop")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={startOpen} onOpenChange={setStartOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("host.startConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("host.startConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setStartOpen(false);
                  try {
                    await onStart?.();
                  } catch {}
                  setTimeout(() => void check(), 800);
                }}
              >
                {t("host.start")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}

function StatusIcon({ state }: { state: HostState }) {
  const cls = "size-8 shrink-0";
  if (state === "ready")
    return <CheckCircle2 className={cn("mt-0.5", cls, "text-primary")} />;
  if (state === "fatal")
    return <AlertTriangle className={cn("mt-0.5", cls, "text-destructive")} />;
  if (state === "unhealthy")
    return <WifiOff className={cn("mt-0.5", cls, "text-muted-foreground")} />;
  return (
    <LoaderCircle className={cn("mt-0.5 animate-spin", cls, "text-primary")} />
  );
}

function LiveCard({
  icon: Icon,
  label,
  value,
  loading,
  sub,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  loading: boolean;
  sub: string;
  tone?: "default" | "destructive";
}) {
  return (
    <Card className={tone === "destructive" ? "border-destructive/30" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={
            tone === "destructive"
              ? "flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              : "flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">{value ?? 0}</p>
          )}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function fmtMinutes(value: number | null, unlimitedLabel: string): string {
  if (value === null) return unlimitedLabel;
  if (value < 60) return `${value}m`;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function statusKey(status: string): string {
  const map: Record<string, string> = {
    waiting: "overview.statusWaiting",
    active: "overview.statusActive",
    completed: "overview.statusCompleted",
    "auto-closed": "overview.statusAutoClosed",
    expired: "overview.statusExpired",
    void: "overview.statusVoid",
  };
  return map[status] ?? status;
}

function TicketRow({
  ticket,
  locale,
  t,
}: {
  ticket: OverviewTicket;
  locale: "id" | "en";
  t: (k: any) => string;
}) {
  const remainingTone =
    ticket.remainingMinutes === null
      ? "text-muted-foreground"
      : ticket.remainingMinutes === 0
        ? "text-destructive font-medium"
        : ticket.remainingMinutes <= 10
          ? "text-[var(--state-warning)] font-medium"
          : "text-foreground font-medium tabular-nums";
  const overtimeTone =
    ticket.overtimeMinutes > 0
      ? "text-destructive font-medium tabular-nums"
      : "text-muted-foreground tabular-nums";
  const outstanding = ticket.outstandingCharge ?? 0;
  const isThreshold =
    ticket.remainingMinutes !== null &&
    ticket.remainingMinutes <= 5 &&
    ticket.remainingMinutes >= 0 &&
    ticket.status === "active"; // threshold 5m and below yellow
  const isOvertimeActive =
    ticket.overtimeMinutes > 0 && ticket.status === "active";
  return (
    <tr
      className={cn(
        "hover:bg-muted/20",
        isOvertimeActive && "bg-destructive/10",
        isThreshold && !isOvertimeActive && "bg-[var(--state-warning-bg)]/40",
      )}
    >
      <td className="px-3 py-2.5">
        <div className="font-mono text-xs leading-tight font-bold">
          {ticket.dailyNumber}
        </div>
        <div className="font-mono text-[11px] leading-tight text-muted-foreground">
          {ticket.code}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[14ch] truncate text-sm leading-tight font-medium">
          {ticket.childName ?? ticket.childId.slice(0, 8)}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {ticket.saleId.slice(0, 8)}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[16ch] truncate text-sm leading-tight">
          {ticket.packageName}
        </div>
        <div className="text-xs text-muted-foreground">
          {ticket.includedMinutes === null
            ? t("calendar.unlimited")
            : `${ticket.includedMinutes}m`}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            ticket.status === "active" &&
              "border-primary/30 bg-primary/10 text-primary",
            ticket.status === "waiting" &&
              "border-border bg-muted text-foreground",
            ticket.status === "completed" &&
              "border-[var(--state-success)]/30 bg-[var(--state-success-bg)] text-[var(--state-success)]",
            ticket.status === "auto-closed" &&
              "border-[var(--state-warning)]/30 bg-[var(--state-warning-bg)] text-[var(--state-warning)]",
            (ticket.status === "expired" || ticket.status === "void") &&
              "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {t(statusKey(ticket.status) as never) ?? ticket.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {fmtMinutes(ticket.playingMinutes, t("calendar.unlimited") as string)}
      </td>
      <td className={cn("px-3 py-2.5 text-right", remainingTone)}>
        {fmtMinutes(ticket.remainingMinutes, t("calendar.unlimited") as string)}
      </td>
      <td className={cn("px-3 py-2.5 text-right", overtimeTone)}>
        {ticket.overtimeMinutes > 0
          ? `+${fmtMinutes(ticket.overtimeMinutes, "-")}`
          : "—"}
      </td>
      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">{`${ticket.graceMinutes ?? 5} ${locale === "id" ? "menit" : "m"}`}</td>
      <td className="px-3 py-2.5 text-right">
        <div className="text-xs leading-tight">
          <span
            className={cn(
              "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium",
              ticket.depositStatus === "held" && "bg-muted text-foreground",
              ticket.depositStatus === "applied" &&
                "bg-primary/10 text-primary",
              ticket.depositStatus === "refunded" &&
                "bg-[var(--state-success-bg)] text-[var(--state-success)]",
              ticket.depositStatus === "forfeited" &&
                "bg-destructive/10 text-destructive",
            )}
          >
            {ticket.depositStatus}
          </span>
        </div>
        {ticket.depositAmount > 0 ? (
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {formatIdr(ticket.depositAmount, locale as "id" | "en")}
          </div>
        ) : (
          <div className="mt-1 text-xs text-muted-foreground">—</div>
        )}
        {outstanding > 0 ? (
          <div className="mt-0.5 font-mono text-xs font-medium text-destructive">
            {formatIdr(outstanding, locale as "id" | "en")}
          </div>
        ) : null}
      </td>
    </tr>
  );
}
