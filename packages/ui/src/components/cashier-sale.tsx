import {
  useCalendarConfig,
  useCompleteSale,
  usePrintAttempt,
  useSession,
  saleArtifactUrl,
  saleQrUrl,
  type TicketLineInput,
  type ProductLineInput,
  type PaymentMethod,
  useCashierDraftStore,
  useClient,
  useProducts,
  useMembershipDiscounts,
  useSchedule,
  usePublicVenue,
} from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { BarcodeScanner } from "@workspace/ui/components/barcode-scanner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FormField } from "@workspace/ui/components/form-field";
import { MemberPicker } from "@workspace/ui/components/member-picker";
import { ProductPicker } from "@workspace/ui/components/product-picker";
import { Select } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useLocale } from "@workspace/ui/lib/i18n";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import * as React from "react";

type DisplayLine = {
  key: string;
  line: TicketLineInput | ProductLineInput;
  count: number;
};
const MAX_PRODUCT_QUANTITY = 24;
const safeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function translateSaleError(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (
    v === "closed" ||
    v.includes("venue is closed") ||
    v.startsWith("venue is closed outside")
  )
    return "sale.errorClosed";
  if (v.includes("insufficient stock")) return "sale.errorStock";
  if (v.includes("product unavailable")) return "sale.errorProductUnavailable";
  if (v.includes("member unavailable")) return "sale.errorMemberUnavailable";
  if (v.includes("more than 12 tickets") || /more than \d+ tickets/.test(v))
    return "sale.errorTicketLimit";
  if (v.includes("1 to 24")) return "sale.errorProductQuantity";
  return "sale.error";
}

export function CashierSale({
  enableCamera = false,
}: {
  enableCamera?: boolean;
}) {
  const { t, locale } = useLocale();
  const { session } = useSession();
  const client = useClient();
  const config = useCalendarConfig();
  const complete = useCompleteSale();
  const print = usePrintAttempt();
  const draft = useCashierDraftStore();
  const venueSettings = usePublicVenue();
  const maxTicketsPerSale = venueSettings.data?.maxTicketsPerSale ?? 12;
  const bulkTicketEnabled = venueSettings.data?.bulkTicketEnabled ?? true;
  const nameCalling = venueSettings.data?.nameCalling ?? false;
  const {
    packageId,
    ticketCount,
    member,
    lines,
    paymentMethod,
    confirmed,
    product,
    productQuantity,
  } = draft;
  const { set: setDraft } = draft;
  const [sale, setSale] = React.useState<
    Awaited<ReturnType<typeof complete.mutateAsync>> | undefined
  >();
  const [qr, setQr] = React.useState<
    { name: string; dataUrl: string } | undefined
  >();
  const [error, setError] = React.useState("");
  const discounts = useMembershipDiscounts();
  const [scannedCode, setScannedCode] = React.useState("");
  const scannedProducts = useProducts(scannedCode || undefined, {
    enabled: Boolean(scannedCode),
  });
  const packages = config.data?.packages.filter((item) => item.active) ?? [];
  const selected = packages.find((item) => item.id === packageId);
  const displayLines = React.useMemo<DisplayLine[]>(() => {
    if (nameCalling) {
      // name calling: render each ticket line individually so names can be edited per ticket
      return lines.map((line, index) => {
        const key = `idx:${index}`;
        return { key, line, count: 1 };
      });
    }
    const grouped = new Map<string, DisplayLine>();
    lines.forEach((line) => {
      const key =
        line.kind === "product"
          ? `product:${line.productId}:${line.quantity}`
          : `ticket:${line.packageId}:${line.memberId ?? "guest"}:${line.childName ?? ""}`;
      const current = grouped.get(key);
      if (current) current.count += 1;
      else grouped.set(key, { key, line, count: 1 });
    });
    return [...grouped.values()];
  }, [lines, nameCalling]);
  const ticketLines = lines.filter((line) => line.kind !== "product").length;
  const validTicketCount =
    Number.isInteger(ticketCount) &&
    ticketCount >= 1 &&
    ticketCount <= maxTicketsPerSale;
  const canAddTickets =
    Boolean(selected) &&
    validTicketCount &&
    ticketLines + (bulkTicketEnabled ? ticketCount : 1) <= maxTicketsPerSale;
  const operatingDate = config.data
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: config.data.timezone,
      }).format(new Date())
    : "";
  const schedule = useSchedule(operatingDate);
  const isWeekend =
    schedule.data?.period === "weekend" ||
    (!schedule.data && operatingDate
      ? [0, 6].includes(new Date(`${operatingDate}T12:00:00`).getDay())
      : false);
  const productFor = React.useCallback(
    (id: string) => draft.products[id],
    [draft.products],
  );
  const total = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        if (line.kind === "product") {
          const item = productFor(line.productId);
          return (
            sum +
            (item?.price ?? 0) * line.quantity -
            (line.memberId
              ? Math.min(
                  discounts.data?.products[line.productId] ?? 0,
                  (item?.price ?? 0) * line.quantity,
                )
              : 0)
          );
        }
        const item = packages.find((pkg) => pkg.id === line.packageId);
        const price = item
          ? (item.overridePrices[operatingDate] ??
            (isWeekend ? item.weekendPrice : item.weekdayPrice))
          : 0;
        const deposit = item?.deposit ?? 0;
        return (
          sum +
          price +
          deposit -
          (line.memberId
            ? Math.min(
                discounts.data?.ticketPackages[line.packageId] ?? 0,
                price,
              )
            : 0)
        );
      }, 0),
    [lines, packages, operatingDate, isWeekend, discounts.data, productFor],
  );
  const depositTotal = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        if (line.kind === "product") return sum;
        const pkg = packages.find(
          (candidate) => candidate.id === line.packageId,
        );
        return sum + (pkg?.deposit ?? 0);
      }, 0),
    [lines, packages],
  );
  const ticketDiscountedTotal = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        if (line.kind === "product") return sum;
        const pkg = packages.find(
          (candidate) => candidate.id === line.packageId,
        );
        const price = pkg
          ? (pkg.overridePrices[operatingDate] ??
            (isWeekend ? pkg.weekendPrice : pkg.weekdayPrice))
          : 0;
        const discount = line.memberId
          ? Math.min(discounts.data?.ticketPackages[line.packageId] ?? 0, price)
          : 0;
        return sum + price - discount;
      }, 0),
    [lines, packages, operatingDate, isWeekend, discounts.data],
  );
  const productDiscountedTotal = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        if (line.kind !== "product") return sum;
        const item = productFor(line.productId);
        const original = (item?.price ?? 0) * line.quantity;
        const discount = line.memberId
          ? Math.min(discounts.data?.products[line.productId] ?? 0, original)
          : 0;
        return sum + original - discount;
      }, 0),
    [lines, productFor, discounts.data],
  );
  const addLine = () => {
    if (!selected || !canAddTickets) return;
    const count = bulkTicketEnabled ? ticketCount : 1;
    setDraft({
      lines: [
        ...lines,
        ...Array.from(
          { length: count },
          () =>
            ({
              childId: member?.childId ?? `child_${safeId()}`,
              childName: member?.name,
              memberId: member?.id,
              packageId: selected.id,
              paymentConfirmed: paymentMethod === "cash",
            }) as TicketLineInput,
        ),
      ],
    });
    setDraft({ packageId: "" });
    setDraft({ ticketCount: 1 });
  };
  const addProduct = (next = product) => {
    if (
      !next ||
      !Number.isInteger(productQuantity) ||
      productQuantity < 1 ||
      productQuantity > MAX_PRODUCT_QUANTITY
    )
      return;
    setDraft({
      products: { ...draft.products, [next.id]: next },
      lines: [
        ...lines,
        {
          kind: "product",
          productId: next.id,
          quantity: productQuantity,
          memberId: member?.id,
        },
      ],
    });
    setDraft({ product: undefined });
    setDraft({ productQuantity: 1 });
  };
  const selectMember = (next: NonNullable<typeof member>) => {
    if (next.status === "deactivated") {
      setError(t("membership.memberDeactivated"));
      return;
    }
    setError("");
    setDraft({
      member: next,
      lines: lines.map((line) =>
        line.kind === "product"
          ? { ...line, memberId: next.id }
          : {
              ...line,
              memberId: next.id,
              childId: next.childId,
              childName: next.name,
            },
      ),
    });
  };
  const clearMember = () =>
    setDraft({
      member: undefined,
      lines: lines.map((line) =>
        line.kind === "product"
          ? { ...line, memberId: undefined }
          : { ...line, memberId: undefined, childId: `child_${safeId()}` },
      ),
    });
  const removeGroup = (groupKey: string) =>
    setDraft({
      lines: lines.filter((line, index) => {
        if (nameCalling) return `idx:${index}` !== groupKey;
        const key =
          line.kind === "product"
            ? `product:${line.productId}:${line.quantity}`
            : `ticket:${line.packageId}:${line.memberId ?? "guest"}:${line.childName ?? ""}`;
        return key !== groupKey;
      }),
    });
  const setTicketName = (index: number, name: string) =>
    setDraft({
      lines: lines.map((line, i) =>
        i === index ? { ...line, childName: name } : line,
      ),
    });
  const clearLines = () =>
    setDraft({
      lines: [],
      packageId: "",
      ticketCount: 1,
      product: undefined,
      productQuantity: 1,
    });
  React.useEffect(() => {
    if (!scannedCode || !scannedProducts.data?.length) return;
    const scanned =
      scannedProducts.data.find(
        (item) =>
          item.barcode === scannedCode ||
          item.sku === scannedCode ||
          item.id === scannedCode,
      ) ?? scannedProducts.data[0];
    addProduct(scanned);
    setScannedCode("");
  }, [scannedCode, scannedProducts.data]);
  const finalize = async () => {
    if (!lines.length) {
      setError(t("sale.errorEmpty"));
      return;
    }
    if (!session?.user) {
      setError(t("sale.errorSession"));
      return;
    }
    if (!config.data) {
      setError(t("sale.errorConfig"));
      return;
    }
    if (nameCalling) {
      const missing = lines.some(
        (line) =>
          line.kind !== "product" &&
          String(line.childName ?? "").trim().length < 3,
      );
      if (missing) {
        setError(t("sale.errorNameRequired"));
        return;
      }
    }
    setError("");
    try {
      const completed = await complete.mutateAsync({
        idempotencyKey: safeId(),
        cashierId: session.user.id,
        operatingDate: new Intl.DateTimeFormat("en-CA", {
          timeZone: config.data.timezone,
        }).format(new Date()),
        lines: lines.map((line) => ({
          ...line,
          paymentConfirmed: paymentMethod === "cash" || confirmed,
        })),
        paymentMethod,
        locale,
      });
      setSale(completed);
      draft.reset();
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message ? cause.message : "";
      setError(t(translateSaleError(message) as Parameters<typeof t>[0]));
    }
  };
  const artifact = async (
    kind: "tickets" | "receipt",
    action: "open" | "download" | "print" = "open",
  ) => {
    if (!sale) return;
    const popup = action === "download" ? undefined : window.open("", "_blank");
    if (popup) popup.opener = null;
    if (action !== "download" && !popup) {
      setError(t("sale.printBlocked"));
      return;
    }
    let navigated = false;
    try {
      const response = await fetch(
        saleArtifactUrl(client.origin, sale.id, kind),
        { headers: { Authorization: `Bearer ${client.getToken()}` } },
      );
      if (!response.ok) throw new Error("Artifact unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${sale.receipt.number}-${kind}.pdf`;
      if (action === "download") anchor.click();
      else {
        if (action === "print")
          popup?.addEventListener("load", () => popup.print(), { once: true });
        if (popup) {
          popup.location.href = url;
          navigated = true;
        }
      }
      await print.mutateAsync({
        saleId: sale.id,
        artifact: kind,
        actorId: session?.user?.id ?? "cashier",
        status: "requested",
        reprint: false,
      });
    } catch (cause) {
      if (!navigated) popup?.close();
      try {
        await print.mutateAsync({
          saleId: sale.id,
          artifact: kind,
          actorId: session?.user?.id ?? "cashier",
          status: "unknown",
          reprint: false,
          reason:
            cause instanceof Error ? cause.message : "Artifact action failed",
        });
      } catch {
        /* preserve the original artifact error */
      }
      setError(
        cause instanceof Error && cause.message === "Artifact unavailable"
          ? t("sale.artifactUnavailable")
          : cause instanceof Error
            ? cause.message
            : t("sale.actionError"),
      );
    }
  };
  if (config.isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  if (sale)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-primary" />
            {t("sale.completed")}
          </CardTitle>
          <CardDescription>
            {sale.receipt.number} · {formatIdr(sale.total, locale)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            {sale.tickets.map((ticket) => (
              <div
                className="flex items-center justify-between gap-3 border p-3"
                key={ticket.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {ticket.childName ?? ticket.childId}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ticket.package.name} · {ticket.code}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ticketUrl = saleQrUrl(
                      client.origin,
                      sale.id,
                      ticket.id,
                    );
                    void fetch(ticketUrl, {
                      headers: { Authorization: `Bearer ${client.getToken()}` },
                    })
                      .then((response) => response.blob())
                      .then((blob) =>
                        setQr({
                          name: ticket.childName ?? ticket.childId,
                          dataUrl: URL.createObjectURL(blob),
                        }),
                      );
                  }}
                >
                  {t("sale.showQr")}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {sale.tickets.length > 0 ? (
              <>
                <Button onClick={() => void artifact("tickets", "print")}>
                  <Printer data-icon="inline-start" />
                  {t("sale.printTickets")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void artifact("tickets", "download")}
                >
                  <Download data-icon="inline-start" />
                  {t("sale.downloadTickets")}
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              onClick={() => void artifact("receipt", "open")}
            >
              <ExternalLink data-icon="inline-start" />
              {t("sale.openReceipt")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void artifact("receipt", "print")}
            >
              <Printer data-icon="inline-start" />
              {t("sale.printReceipt")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void artifact("receipt", "download")}
            >
              <Download data-icon="inline-start" />
              {t("sale.downloadReceipt")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSale(undefined);
                draft.reset();
              }}
            >
              {t("sale.newSale")}
            </Button>
          </div>
          {qr && (
            <div
              role="dialog"
              className="grid justify-items-center gap-2 border p-4"
            >
              <p className="font-medium">{qr.name}</p>
              <img
                src={qr.dataUrl}
                alt={`${t("sale.showQr")} ${qr.name}`}
                className="size-48"
              />
              <Button variant="ghost" onClick={() => setQr(undefined)}>
                {t("sale.close")}
              </Button>
            </div>
          )}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>{t("sale.actionError")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart />
          {t("sale.title")}
        </CardTitle>
        <CardDescription>{t("sale.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {enableCamera && (
          <BarcodeScanner
            onDetect={(value) => setScannedCode(value.trim())}
            repeatable
          />
        )}
        <MemberPicker
          onSelect={(selectedMember) => {
            if (!selectedMember) {
              clearMember();
              return;
            }
            selectMember(selectedMember);
          }}
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <FormField
            label={t("sale.choosePackage")}
            required
            htmlFor="sale-package"
          >
            <Select
              id="sale-package"
              className="h-10"
              value={packageId}
              onChange={(event) => setDraft({ packageId: event.target.value })}
            >
              <option value="">{t("sale.choosePackage")}</option>
              {packages.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name} · {formatIdr(item.weekdayPrice, locale)}
                </option>
              ))}
            </Select>
          </FormField>
          {bulkTicketEnabled ? (
            <FormField
              label={t("sale.ticketCount")}
              required
              htmlFor="sale-ticket-count"
            >
              <input
                id="sale-ticket-count"
                className="h-10 w-full border border-input bg-background px-3"
                type="number"
                inputMode="numeric"
                min="1"
                max={Math.max(1, maxTicketsPerSale - ticketLines)}
                step="1"
                value={ticketCount}
                onChange={(event) =>
                  setDraft({ ticketCount: Number(event.target.value) })
                }
              />
            </FormField>
          ) : null}
          <Button
            className="h-10 self-end"
            type="button"
            onClick={addLine}
            disabled={!canAddTickets}
          >
            {t("sale.addLine")}
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            {t("sale.ticketLimit").replace("{n}", String(maxTicketsPerSale))}
          </p>
        </div>
        <div className="grid gap-3 border-t pt-4">
          <p className="text-sm font-medium">{t("sale.addProduct")}</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
            <ProductPicker
              value={product}
              onSelect={(next) => {
                setDraft({ product: next });
              }}
            />
            <FormField
              label="Quantity"
              required
              htmlFor="cashier-product-quantity"
            >
              <input
                id="cashier-product-quantity"
                className="h-10 w-full border border-input bg-background px-3"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_PRODUCT_QUANTITY}
                step="1"
                value={productQuantity}
                onChange={(event) =>
                  setDraft({ productQuantity: Number(event.target.value) })
                }
              />
            </FormField>
            <Button
              className="h-10 self-end"
              variant="outline"
              type="button"
              onClick={() => addProduct()}
              disabled={
                !product ||
                !Number.isInteger(productQuantity) ||
                productQuantity < 1 ||
                productQuantity > MAX_PRODUCT_QUANTITY
              }
            >
              {t("sale.addProduct")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("sale.productQuantityLimit")}
          </p>
        </div>
        <div className="grid gap-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("sale.summary")}</h2>
            {lines.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearLines}
              >
                <RotateCcw data-icon="inline-start" />
                {t("sale.clearSummary")}
              </Button>
            ) : null}
          </div>
          {(() => {
            let ticketIndex = 0;
            return displayLines.map(({ key, line, count }, lineIndex) => {
              const isTicket = line.kind !== "product";
              const ticketNo = isTicket ? ++ticketIndex : 0;
              const item = isTicket ? undefined : productFor(line.productId);
              const original =
                line.kind === "product"
                  ? (item?.price ?? 0) * line.quantity
                  : (() => {
                      const pkg = packages.find(
                        (candidate) => candidate.id === line.packageId,
                      );
                      return pkg
                        ? (pkg.overridePrices[operatingDate] ??
                            (isWeekend ? pkg.weekendPrice : pkg.weekdayPrice))
                        : 0;
                    })() * count;
              const discount =
                line.kind === "product"
                  ? line.memberId
                    ? Math.min(
                        discounts.data?.products[line.productId] ?? 0,
                        original,
                      )
                    : 0
                  : line.memberId
                    ? Math.min(
                        discounts.data?.ticketPackages[line.packageId] ?? 0,
                        original / count,
                      ) * count
                    : 0;
              const depositPerGroup =
                line.kind !== "product"
                  ? (() => {
                      const pkg = packages.find(
                        (candidate) => candidate.id === line.packageId,
                      );
                      return (pkg?.deposit ?? 0) * count;
                    })()
                  : 0;
              const final = original - discount;
              const pkgName = isTicket
                ? (packages.find((candidate) => candidate.id === line.packageId)
                    ?.name ?? t("sale.ticket"))
                : undefined;
              return (
                <div
                  className="grid gap-2 border-b py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                  key={key}
                >
                  <div className="min-w-0">
                    {nameCalling && isTicket ? (
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          {t("sale.childNameLabel")
                            .replace("{n}", String(ticketNo))
                            .replace("{p}", pkgName ?? "")}
                        </label>
                        <input
                          className="h-9 w-full max-w-[320px] border border-input bg-background px-3"
                          value={String(line.childName ?? "")}
                          minLength={3}
                          maxLength={30}
                          placeholder={t("sale.childNamePlaceholder")}
                          onChange={(e) =>
                            setTicketName(lineIndex, e.target.value)
                          }
                        />
                      </div>
                    ) : (
                      <p className="font-medium">
                        {line.kind === "product"
                          ? (item?.name ?? line.productId)
                          : pkgName}
                        {count > 1 ? ` × ${count}` : ""}
                        {line.kind === "product" && line.quantity > 1
                          ? ` × ${line.quantity}`
                          : ""}
                      </p>
                    )}
                    {discount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("sale.memberDiscountApplied")}
                      </p>
                    ) : null}
                    {depositPerGroup > 0 && line.kind !== "product"
                      ? (() => {
                          const pkg = packages.find(
                            (c) => c.id === (line as TicketLineInput).packageId,
                          );
                          const unit = pkg?.deposit ?? 0;
                          return (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                {t("sale.deposit")}:{" "}
                                {count > 1
                                  ? `${formatIdr(unit, locale)} × ${count}`
                                  : ""}
                              </span>
                              <span className="font-mono text-foreground tabular-nums">
                                {formatIdr(depositPerGroup, locale)}
                              </span>
                            </div>
                          );
                        })()
                      : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {discount > 0 ? (
                        <>
                          <div className="text-xs text-muted-foreground line-through">
                            {formatIdr(original, locale)}
                          </div>
                          <div className="font-semibold text-[var(--state-success)]">
                            {formatIdr(final, locale)}
                          </div>
                        </>
                      ) : (
                        <div className="font-medium">
                          {formatIdr(final, locale)}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("sale.removeLine")}
                      onClick={() => removeGroup(key)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
        <div className="grid gap-3 border-t pt-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              {t("sale.ticketDiscounted")}
            </span>
            <span className="font-mono tabular-nums">
              {formatIdr(ticketDiscountedTotal, locale)}
            </span>
          </div>
          {depositTotal > 0 ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t("sale.deposit")}</span>
              <span className="font-mono tabular-nums">
                {formatIdr(depositTotal, locale)}
              </span>
            </div>
          ) : null}
          {productDiscountedTotal > 0 ? (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">
                {t("sale.productDiscounted")}
              </span>
              <span className="font-mono tabular-nums">
                {formatIdr(productDiscountedTotal, locale)}
              </span>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("sale.grandTotal")}
              </p>
              <p className="text-2xl font-semibold">
                {formatIdr(total, locale)}
              </p>
            </div>
            <select
              className="h-10 border border-input bg-background px-3"
              value={paymentMethod}
              onChange={(e) =>
                setDraft({ paymentMethod: e.target.value as PaymentMethod })
              }
            >
              <option value="cash">{t("sale.cash")}</option>
              <option value="QRIS">QRIS</option>
              <option value="bank-transfer">{t("sale.bankTransfer")}</option>
            </select>
          </div>
        </div>
        {paymentMethod !== "cash" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setDraft({ confirmed: e.target.checked })}
            />
            {t("sale.confirmPayment")}
          </label>
        )}
        <Button
          className="h-10"
          onClick={() => void finalize()}
          disabled={
            complete.isPending ||
            !lines.length ||
            (paymentMethod !== "cash" && !confirmed)
          }
        >
          {t("sale.complete")}
        </Button>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>{t("sale.error")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
