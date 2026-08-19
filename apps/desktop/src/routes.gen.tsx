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
import { CalendarSettings } from "@workspace/ui/components/calendar-settings";
import { CashierSale } from "@workspace/ui/components/cashier-sale";
import { DeviceManagement } from "@workspace/ui/components/device-management";
import { HostOverviewPage } from "@workspace/ui/components/host-overview-page";
import { InventoryDashboard } from "@workspace/ui/components/inventory-dashboard";
import { MembershipDashboard } from "@workspace/ui/components/membership-dashboard";
import { MemberCardPrint } from "@workspace/ui/components/member-card-print";
import { MembershipDiscountSettings } from "@workspace/ui/components/membership-discount-settings";
import { OwnerInventory } from "@workspace/ui/components/owner-inventory";
import { ProductCatalog } from "@workspace/ui/components/product-catalog";
import { PublicKiosk } from "@workspace/ui/components/public-kiosk";
import { ReportsDashboard } from "@workspace/ui/components/reports-dashboard";
import {
  RouteAccessGate,
  useRouteAccess,
} from "@workspace/ui/components/route-access-guard";
import { TicketScanner } from "@workspace/ui/components/ticket-scanner";
import { TicketPackageSettings } from "@workspace/ui/components/ticket-package-settings";
import { createHttpHostSource } from "@workspace/ui/lib/host";
import { ThemeProvider } from "@workspace/ui/providers/theme-provider";
import { useEffect } from "react";
import "@workspace/ui/globals.css";

const origin =
  import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const source = createHttpHostSource(origin);
const stop = async () => {
  await invoke("stop_host");
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
      <HostOverviewPage source={source} origin={origin} onStop={stop} />
    </RouteAccessGate>
  ),
});

const salesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/sales",
  component: () => (
    <RouteAccessGate requireMode="Cashier">
      <CashierSale />
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
  component: () => (
    <RouteAccessGate requireMode="Inventory">
      <InventoryDashboard />
    </RouteAccessGate>
  ),
});

const scannerEntryRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/scanner/entry",
  component: () => (
    <RouteAccessGate requireMode="Entrance Scanner">
      <TicketScanner kind="entry" />
    </RouteAccessGate>
  ),
});

const scannerExitRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/scanner/exit",
  component: () => (
    <RouteAccessGate requireMode="Exit Scanner">
      <TicketScanner kind="exit" />
    </RouteAccessGate>
  ),
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

const ownerCatalogRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/catalog",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <ProductCatalog />
    </RouteAccessGate>
  ),
});

const ownerInventoryRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/inventory",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <OwnerInventory />
    </RouteAccessGate>
  ),
});

const ownerMembershipsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/memberships",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <MembershipDashboard />
    </RouteAccessGate>
  ),
});

const ownerMembershipDiscountsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/owner/membership-discounts",
  component: () => (
    <RouteAccessGate requireRole="Owner">
      <MembershipDiscountSettings />
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
      membersRoute,
      inventoryRoute,
      scannerEntryRoute,
      scannerExitRoute,
      ownerDevicesRoute,
      ownerCalendarRoute,
      ownerPackagesRoute,
      ownerCatalogRoute,
      ownerInventoryRoute,
      ownerMembershipsRoute,
      ownerMembershipDiscountsRoute,
      ownerReportsRoute,
      ownerBackupsRoute,
    ]),
  ]),
]);
