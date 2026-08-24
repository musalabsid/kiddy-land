import * as React from "react";
import { Download, ExternalLink, Eye, Printer, RefreshCw } from "lucide-react";
import { useCalendarConfig, useSales, saleArtifactUrl, useClient } from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import { useLocale } from "@workspace/ui/lib/i18n";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function CashierTodaySales() {
  const { t, locale } = useLocale();
  const config = useCalendarConfig();
  const client = useClient();
  const operatingDate = config.data
    ? new Intl.DateTimeFormat("en-CA", { timeZone: config.data.timezone }).format(new Date())
    : new Intl.DateTimeFormat("en-CA").format(new Date());
  const query = useSales({ operatingDate });
  const sales = query.data ?? [];
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const artifact = async (saleId: string, kind: "tickets" | "receipt", action: "open" | "download" = "open") => {
    const popup = action === "open" ? window.open("", "_blank") : null;
    if (action === "open" && !popup) {
      toast.error(t("sale.printBlocked"));
      return;
    }
    try {
      const url = saleArtifactUrl(client.origin, saleId, kind);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${client.getToken()}` } });
      if (!response.ok) throw new Error("Artifact unavailable");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (action === "open" && popup) {
        popup.location.href = blobUrl;
      } else {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${saleId}-${kind}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      if (popup) popup.close();
      toast.error(t("sale.artifactUnavailable"));
    }
  };

  if (query.isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("sale.todayTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{t("sale.todayTitle")}</CardTitle>
          <CardDescription>{t("sale.todaySubtitle")}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          <RefreshCw data-icon="inline-start" className="size-4" />
          {t("sale.todayRefresh")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-xs text-muted-foreground">
          {t("sale.todayCount").replace("{count}", String(sales.length))} · {operatingDate}
        </p>
        {sales.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("sale.todayEmpty")}</p>
        ) : (
          sales.map((sale) => {
            const time = new Date(sale.createdAt).toLocaleTimeString(locale === "id" ? "id-ID" : "en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isExpanded = expanded === sale.id;
            const memberLabel = sale.lines.find((l) => l.memberId)?.memberId ? `${t("sale.member")}` : t("sale.guest");
            return (
              <div key={sale.id} className="grid gap-2 border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {sale.receipt.number} · {time} · {sale.status === "void" ? "void" : sale.paymentMethod}
                    </p>
                    <p className="truncate text-sm font-medium">
                      {formatIdr(sale.total, locale)} · {sale.tickets.length} {t("sale.ticket")}
                      {sale.tickets.length !== 1 ? "s" : ""}
                      {sale.lines.filter((l) => l.kind === "product").length
                        ? ` + ${sale.lines.filter((l) => l.kind === "product").length} product`
                        : ""}{" "}
                      · {memberLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setExpanded(isExpanded ? null : sale.id)}>
                      <Eye data-icon="inline-start" className="size-3.5" />
                      {t("sale.details")}
                    </Button>
                    {sale.tickets.length > 0 ? <Button size="sm" variant="outline" onClick={() => void artifact(sale.id, "tickets", "open")}>
                      <Printer data-icon="inline-start" className="size-3.5" />
                      {t("sale.reprintTickets")}
                    </Button> : null}
                    <Button size="sm" variant="outline" onClick={() => void artifact(sale.id, "receipt", "open")}>
                      <ExternalLink data-icon="inline-start" className="size-3.5" />
                      {t("sale.reprintReceipt")}
                    </Button>
                  </div>
                </div>
                {isExpanded ? (
                  <div className="grid gap-2 border-t pt-3 text-sm">
                    {sale.tickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">
                          <span className="font-medium">{ticket.childName ?? ticket.childId}</span>{" "}
                          <span className="text-muted-foreground">
                            · {ticket.package.name} · {ticket.code}
                          </span>
                          {sale.lines.find(
                            (l) => l.kind === "ticket" && (l as unknown as { ticketId: string }).ticketId === ticket.id && (l as unknown as { memberId?: string }).memberId,
                          ) ? (
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5">{t("sale.member")}</span>
                          ) : null}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            const url = `${client.origin}/sales/${sale.id}/tickets/${ticket.id}/qr`;
                            fetch(url, { headers: { Authorization: `Bearer ${client.getToken()}` } })
                              .then((r) => r.blob())
                              .then((blob) => {
                                const u = URL.createObjectURL(blob);
                                window.open(u, "_blank");
                              });
                          }}
                        >
                          {t("sale.showQr")}
                        </Button>
                      </div>
                    ))}
                    {sale.lines
                      .filter((l) => l.kind === "product")
                      .map((line) => {
                        const p = line as Extract<typeof line, { kind: "product" }>;
                        return (
                          <div key={p.lineId} className="flex justify-between gap-2 text-xs">
                            <span className="truncate">
                              {p.productName} · x{p.quantity}
                              {p.memberId ? ` · ${t("sale.member")}` : ""}
                            </span>
                            <span className="font-mono tabular-nums">{formatIdr(p.total, locale)}</span>
                          </div>
                        );
                      })}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sale.tickets.length > 0 ? <Button size="sm" variant="outline" onClick={() => void artifact(sale.id, "tickets", "download")}>
                        <Download data-icon="inline-start" className="size-3.5" />
                        {t("sale.downloadTickets")}
                      </Button> : null}
                      <Button size="sm" variant="outline" onClick={() => void artifact(sale.id, "receipt", "download")}>
                        <Download data-icon="inline-start" className="size-3.5" />
                        {t("sale.downloadReceipt")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
