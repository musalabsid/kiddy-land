import * as React from "react";
import { usePublicProducts, usePublicTicket, type PublicProduct, type PublicTicketResult } from "@kiddy-land/client/react";
import { usePublicVenue } from "@kiddy-land/client";
import { useClient } from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { BarcodeScanner } from "@workspace/ui/components/barcode-scanner";
import { ScanLine, Package } from "lucide-react";

export function PublicKiosk() {
  const { t, locale } = useLocale();
  const client = useClient();
  const [isScanning, setIsScanning] = React.useState(false);
  const [ticketData, setTicketData] = React.useState<PublicTicketResult | null>(null);
  const [productData, setProductData] = React.useState<PublicProduct | null>(null);
  const [code, setCode] = React.useState("");
  const [scannedValue, setScannedValue] = React.useState<string | null>(null);
  const venueQuery = usePublicVenue();
  const productsQuery = usePublicProducts();
  const ticketQuery = usePublicTicket(code);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const products = React.useMemo(() => (productsQuery.data ?? []).slice(0, 100), [productsQuery.data]);

  const clearScan = React.useCallback(() => {
    setTicketData(null);
    setProductData(null);
    setCode("");
    setScannedValue(null);
  }, []);

  const startScan = React.useCallback(() => {
    clearScan();
    setIsScanning(true);
  }, [clearScan]);

  const stopScan = React.useCallback(() => {
    setIsScanning(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!isScanning) return;
    timeoutRef.current = setTimeout(() => {
      setIsScanning(false);
    }, 30000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isScanning]);

  React.useEffect(() => {
    if (!ticketData && !productData) return;
    const id = setTimeout(() => {
      setTicketData(null);
      setProductData(null);
      setCode("");
      setScannedValue(null);
    }, 15000);
    return () => clearTimeout(id);
  }, [ticketData, productData]);

  const handleDetect = React.useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setScannedValue(value);
    // try product first
    const product = products.find((p) => p.barcode === value || p.sku === value || p.id === value);
    if (product) {
      setProductData(product);
      setTicketData(null);
      stopScan();
      return;
    }
    // otherwise treat as ticket code
    setCode(value);
  }, [products, stopScan]);

  React.useEffect(() => {
    if (!code) return;
    void ticketQuery.refetch().then((res) => {
      if (res.data) {
        setTicketData(res.data);
        setProductData(null);
      } else {
        setTicketData({ ok: false, state: "invalid", message: "Ticket not found", remainingMinutes: 0 } as unknown as PublicTicketResult);
      }
      stopScan();
    }).catch(() => {
      setTicketData({ ok: false, state: "invalid", message: "Ticket not found", remainingMinutes: 0 } as unknown as PublicTicketResult);
      stopScan();
    });
  }, [code]);

  return (
    <main className="h-dvh overflow-hidden bg-background">
      <div className="mx-auto flex h-dvh max-w-[1280px] gap-6 p-4 md:p-6 overflow-hidden">
        {/* Left - Scanner */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><h1 className="text-lg font-semibold tracking-tight">{venueQuery.data?.venueName ?? "Kiddy Land"}</h1>{venueQuery.data?.logoUrl ? <img src={venueQuery.data.logoUrl} alt={venueQuery.data.venueName} className="size-7 rounded border object-cover" /> : null}</div>
            <span className="text-xs text-muted-foreground">{t("kiosk.publicKiosk")}</span>
          </div>

          {/* Square scanner */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[480px] items-center justify-center overflow-hidden border-2 border-dashed bg-muted/20">
            {!isScanning ? (
              <Button size="lg" onClick={startScan} className="gap-2">
                <ScanLine className="size-5" />
                {t("kiosk.tapToScan")}
              </Button>
            ) : (
              <div className="absolute inset-0">
                <BarcodeScanner onDetect={handleDetect} repeatable autoStart className="h-full w-full" />
                <Button variant="ghost" size="sm" className="absolute right-2 top-2 bg-background/80" onClick={stopScan}>
                  {t("kiosk.cancel")}
                </Button>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {isScanning ? t("kiosk.scanHintActive") : t("kiosk.scanHintIdle")}
          </p>

          {/* Result underneath */}
          <div className="grid gap-3">
            {productData ? (
              <Card className="bg-card shadow-sm border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Package className="size-4" /> {productData.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  {productData.imageUrl ? (
                    <img src={`${client.origin}${productData.imageUrl}?access_token=${client.getToken() ?? ""}`} alt={productData.name} className="size-24 shrink-0 rounded-none border object-cover" />
                  ) : (
                    <div className="size-24 shrink-0 border bg-muted" />
                  )}
                  <div className="grid gap-1 text-sm">
                    <p className="font-mono text-xs text-muted-foreground break-all">{t("kiosk.code")}: {scannedValue}</p>
                    <p className="font-medium">{productData.name}</p>
                    <p className="text-xs text-muted-foreground">{productData.sku} {productData.barcode ? `· ${productData.barcode}` : ""}</p>
                    <p className="font-mono font-semibold">{formatIdr(productData.price, locale)}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {ticketData ? (
              <Card className={ticketData.ok ? "border-l-[3px] border-[var(--state-success)] bg-[var(--state-success-bg)]/40" : "border-l-[3px] border-[var(--state-danger)] bg-[var(--state-danger-bg)]/40"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{ticketData.ok ? t("kiosk.ticketValid") : t("kiosk.ticketInvalid")}</CardTitle>
                  {scannedValue ? <p className="font-mono text-xs text-muted-foreground break-all">{t("kiosk.code")}: {scannedValue}</p> : null}
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <p className={ticketData.ok ? "text-[var(--state-success)]" : "text-[var(--state-danger)]"}>{ticketData.message}</p>
                  {ticketData.ticket ? (
                    <>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{t("kiosk.package")}</span><span className="font-medium">{ticketData.ticket.package.name}</span></div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{t("kiosk.status")}</span><span className="font-mono capitalize">{ticketData.state}</span></div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{t("kiosk.timeLeft")}</span><span className="font-mono">{ticketData.remainingMinutes} min</span></div>
                      {ticketData.overtimeMinutes != null && ticketData.overtimeMinutes > 0 ? <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{t("kiosk.overtime")}</span><span className="font-mono text-[var(--state-warning)]">{ticketData.overtimeMinutes} min</span></div> : null}
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{t("kiosk.child")}</span><span className="font-mono">{ticketData.ticket.childName ?? ticketData.ticket.childId.slice(0, 8)}</span></div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{t("kiosk.code")}</span><span className="font-mono text-xs">{ticketData.ticket.code}</span></div>
                    </>
                  ) : null}
                  {!ticketData.ticket ? <p className="text-xs text-muted-foreground">remaining: {ticketData.remainingMinutes} min</p> : null}
                </CardContent>
              </Card>
            ) : null}
            {!productData && !ticketData ? (
              scannedValue ? (
                <Card className="border-l-[3px] border-[var(--state-danger)] bg-[var(--state-danger-bg)]/40">
                  <CardHeader className="pb-3"><CardTitle className="text-base">{t("kiosk.ticketInvalid")}</CardTitle><p className="font-mono text-xs text-muted-foreground break-all">{t("kiosk.code")}: {scannedValue}</p></CardHeader>
                  <CardContent><p className="text-sm text-[var(--state-danger)]">Ticket not found</p></CardContent>
                </Card>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("kiosk.scanEmpty")}</p>
              )
            ) : null}
          </div>
        </div>

        {/* Right - Product list */}
        <div className="hidden w-[340px] shrink-0 flex-col overflow-hidden border bg-card md:flex">
          <div className="border-b p-3">
            <h2 className="text-sm font-semibold">{t("kiosk.products")}</h2>
            <p className="text-xs text-muted-foreground">{t("kiosk.productsHint").replace("{count}", String(products.length))}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {productsQuery.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">{t("kiosk.loading")}</p>
            ) : products.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("kiosk.noProducts")}</p>
            ) : (
              <div className="divide-y">
                {products.map((product) => (
                  <div key={product.id} className="flex gap-3 p-3">
                    {product.imageUrl ? (
                      <img src={`${client.origin}${product.imageUrl}?access_token=${client.getToken() ?? ""}`} alt={product.name} className="size-16 shrink-0 rounded-none border object-cover" />
                    ) : (
                      <div className="size-16 shrink-0 border bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
                      <p className="font-mono text-xs font-semibold">{formatIdr(product.price, locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mobile product list */}
      <div className="border-t md:hidden">
        <div className="p-3">
          <h2 className="text-sm font-semibold">{t("kiosk.products")}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto p-3">
          {products.map((product) => (
            <div key={product.id} className="flex w-32 shrink-0 flex-col gap-2 border p-2">
              {product.imageUrl ? (
                <img src={`${client.origin}${product.imageUrl}?access_token=${client.getToken() ?? ""}`} alt={product.name} className="aspect-square w-full rounded-none border object-cover" />
              ) : (
                <div className="aspect-square w-full border bg-muted" />
              )}
              <p className="truncate text-xs font-medium">{product.name}</p>
              <p className="font-mono text-xs">{formatIdr(product.price, locale)}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
