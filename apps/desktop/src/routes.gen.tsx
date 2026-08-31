import { ClientProvider, useSession } from "@kiddy-land/client/react";
import { LocaleProvider } from "@kiddy-land/localization/react";
import {
  createRootRoute,
  createRoute,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { AppShell } from "@workspace/ui/components/app-shell";
import {
  AuthScreen,
  OwnerLoginScreen,
} from "@workspace/ui/components/auth-screen";
import { BackupDashboard } from "@workspace/ui/components/backup-dashboard";
import { VenueCustomization } from "@workspace/ui/components/venue-customization";
import { CalendarSettings } from "@workspace/ui/components/calendar-settings";
import { CashierSale } from "@workspace/ui/components/cashier-sale";
import { CashierTodaySales } from "@workspace/ui/components/cashier-today-sales";
import { DeviceManagement } from "@workspace/ui/components/device-management";
import { HostOverviewPage } from "@workspace/ui/components/host-overview-page";
import { InventoryDashboard } from "@workspace/ui/components/inventory-dashboard";
import { MembershipDashboard } from "@workspace/ui/components/membership-dashboard";
import { MemberCardPrint } from "@workspace/ui/components/member-card-print";
import { MembershipDiscountSettings } from "@workspace/ui/components/membership-discount-settings";
import { ProductCatalog } from "@workspace/ui/components/product-catalog";
import { PublicKiosk } from "@workspace/ui/components/public-kiosk";
import { ReportsDashboard } from "@workspace/ui/components/reports-dashboard";
import {
  RouteAccessGate,
  useRouteAccess,
} from "@workspace/ui/components/route-access-guard";
import { TicketScanner } from "@workspace/ui/components/ticket-scanner";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { useLocale } from "@workspace/ui/lib/i18n";
import { TicketPackageSettings } from "@workspace/ui/components/ticket-package-settings";
import { createHttpHostSource } from "@workspace/ui/lib/host";
import { ThemeProvider } from "@workspace/ui/providers/theme-provider";
import { useEffect } from "react";
import "@workspace/ui/globals.css";

const origin =
  import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const source = createHttpHostSource(origin);
const stop = async () => {
  console.log("[DEBUG-host] invoke stop_host");
  try { await invoke("stop_host"); console.log("[DEBUG-host] stop_host ok"); } catch(e){ console.log("[DEBUG-host] stop_host failed", e); throw e; }
};
const start = async () => {
  console.log("[DEBUG-host] invoke start_host");
  try { await invoke("start_host"); console.log("[DEBUG-host] start_host ok"); } catch(e){ console.log("[DEBUG-host] start_host failed", e); throw e; }
};

const rootRoute = createRootRoute({
  component: () => (
    <ClientProvider origin={origin}>
      <LocaleProvider>
        <ThemeProvider>
          <SessionRefresh />
          <Outlet />
        </ThemeProvider>
      </LocaleProvider>
    </ClientProvider>
  ),
});

const ownerLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/owner-login",
  component: OwnerLoginRouteComponent,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AuthenticatedLayout,
});

const kioskRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/kiosk",
  component: () => (
    <RouteAccessGate requireMode="Public Kiosk">
      <PublicKiosk />
    </RouteAccessGate>
  ),
});

const memberCardPrintRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/member-card/print",
  component: () => {
    const search = new URLSearchParams(window.location.search);
    return <MemberCardPrint name={search.get("name") ?? "Member"} code={search.get("code") ?? ""} phone={search.get("phone") || undefined} />;
  },
});

const shellRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: "shell",
  component: ShellLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <HostOverviewPage source={source} origin={origin} onStop={stop} onStart={start} />
    </RouteAccessGate>
  ),
});

const salesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/sales",
  component: () => (
    <RouteAccessGate requireMode="Cashier">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <CashierSale />
      </div>
    </RouteAccessGate>
  ),
});

const salesHistoryRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/sales-history",
  component: () => (
    <RouteAccessGate requireMode="Cashier">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <CashierTodaySales />
      </div>
    </RouteAccessGate>
  ),
});

const membersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/members",
  component: () => (
    <RouteAccessGate requireRole="Owner" allowCashier>
      <MembershipDashboard />
    </RouteAccessGate>
  ),
});

const inventoryRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory",
  component: () => {
    const navigate = useNavigate();
    useEffect(() => { void navigate({ to: "/owner/inventory" }); }, [navigate]);
    return null;
  },
});

const scannerRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/scanner",
  component: () => {
    const { t } = useLocale();
    const [tab, setTab] = useState<"entry" | "exit">("entry");
    return (
      <RouteAccessGate requireMode="Scanner">
        <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Button variant={tab === "entry" ? "default" : "outline"} onClick={() => setTab("entry")}>
                {t("scanner.entryTitle")}
              </Button>
              <Button variant={tab === "exit" ? "default" : "outline"} onClick={() => setTab("exit")}>
                {t("scanner.exitTitle")}
              </Button>
            </div>
            {tab === "entry" ? <TicketScanner key="entry" kind="entry" /> : <TicketScanner key="exit" kind="exit" />}
          </div>
        </div>
      </RouteAccessGate>
    );
  },
});

const ownerDevicesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/devices",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <DeviceManagement origin={origin} />
    </RouteAccessGate>
  ),
});

const ownerPackagesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/packages",
  component: () => <RouteAccessGate requireRole="Owner"><TicketPackageSettings /></RouteAccessGate>,
});

const ownerCalendarRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/calendar",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <CalendarSettings />
    </RouteAccessGate>
  ),
});

const ownerInventoryRedirectRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/inventory",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <InventoryDashboard />
    </RouteAccessGate>
  ),
});

const ownerCatalogRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/catalog",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <ProductCatalog />
    </RouteAccessGate>
  ),
});



const ownerMembershipsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/memberships",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <MembershipDashboard />
      </div>
    </RouteAccessGate>
  ),
});

const ownerMembershipDiscountsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/membership-discounts",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <MembershipDiscountSettings />
      </div>
    </RouteAccessGate>
  ),
});

const ownerReportsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/reports",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <ReportsDashboard />
    </RouteAccessGate>
  ),
});

const ownerBackupsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/backups",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <BackupDashboard />
    </RouteAccessGate>
  ),
});

const ownerCustomizationRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/customization",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <VenueCustomization />
    </RouteAccessGate>
  ),
});

const ownerSettingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/settings",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <VenueCustomization />
    </RouteAccessGate>
  ),
});

function SessionRefresh() {
  useSession();
  return null;
}

function AuthenticatedLayout() {
  return (
    <AuthScreen origin={origin}>
      <Outlet />
    </AuthScreen>
  );
}

function ShellLayout() {
  const { isKiosk } = useRouteAccess();
  const navigate = useNavigate();
  useEffect(() => {
    if (isKiosk) void navigate({ to: "/kiosk" });
  }, [isKiosk, navigate]);
  if (isKiosk) return null;
  return (
    <RouteAccessGate>
      <AppShell>
        <Outlet />
      </AppShell>
    </RouteAccessGate>
  );
}

function OwnerLoginRouteComponent() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <OwnerLoginScreen onSuccess={() => void navigate({ to: "/" })} />
      </div>
    </main>
  );
}

export const routeTree = rootRoute.addChildren([
  ownerLoginRoute,
  authenticatedRoute.addChildren([
    memberCardPrintRoute,
    kioskRoute,
    shellRoute.addChildren([
      indexRoute,
      salesRoute,
      salesHistoryRoute,
      membersRoute,
      inventoryRoute,
      scannerRoute,
      ownerDevicesRoute,
      ownerCalendarRoute,
      ownerPackagesRoute,
      ownerInventoryRedirectRoute,
      ownerCatalogRoute,
      ownerMembershipsRoute,
      ownerMembershipDiscountsRoute,
      ownerReportsRoute,
      ownerBackupsRoute,
      ownerCustomizationRoute,
      ownerSettingsRoute,
    ]),
  ]),
]);
