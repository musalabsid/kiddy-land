import { useLogout, useSession } from "@kiddy-land/client/react";
import { usePublicVenue } from "@kiddy-land/client";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { NotificationAlerts, SoundPreference, useNotificationSound } from "@workspace/ui/components/notification-alerts";
import { useAlertSound } from "@kiddy-land/client";
import { Toaster } from "@workspace/ui/components/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@workspace/ui/components/sidebar";
import { useLocale, type MessageKey } from "@workspace/ui/lib/i18n";
import { ConnectionBanner } from "@workspace/ui/components/connection-banner";
import { useTheme } from "@workspace/ui/providers/theme-provider";
import {
  BarChart3,
  CalendarDays,
  HardDrive,
  PackageCheck,
  LayoutDashboard,
  MonitorPlay,
  PackageIcon,
  Percent,
  ScanLine,
  Settings2,
  ShoppingCart,
  History,
  Tags,
  Users,
  Monitor,
  Palette,
  Moon,
  Sun
} from "lucide-react";
import type { ReactNode } from "react";

const modeLabelKeys: Record<
  string,
  | "auth.modeCashier"
  | "auth.modeScanner"
  | "auth.modeInventory"
  | "auth.modeKiosk"
  | "auth.modeOwner"
> = {
  Cashier: "auth.modeCashier",
  Scanner: "auth.modeScanner",
  Inventory: "auth.modeInventory",
  "Public Kiosk": "auth.modeKiosk",
  "Owner Dashboard": "auth.modeOwner"
};

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { session } = useSession();
  const { pathname } = useLocation();
  const logout = useLogout();
  const { soundEnabled, setSoundEnabled } = useNotificationSound();
  useAlertSound();
  const venue = usePublicVenue();
  const active = (path: string) => pathname === path;
  const pageTitleKey = (pathname === "/" ? "app.overview" : pathname === "/sales" ? "app.sales" : pathname === "/sales-history" ? "app.salesHistory" : pathname === "/members" ? "app.members" : pathname === "/inventory" || pathname === "/owner/inventory" ? "app.inventory" : pathname === "/scanner" ? "app.scanner" : pathname === "/kiosk" ? "app.kiosk" : pathname === "/owner/devices" ? "app.devices" : pathname === "/owner/calendar" ? "app.calendar" : pathname === "/owner/packages" ? "app.packages" : pathname === "/owner/catalog" ? "app.catalog" : pathname === "/owner/memberships" ? "app.memberships" : pathname === "/owner/membership-discounts" ? "app.membershipDiscounts" : pathname === "/owner/reports" ? "app.reports" : pathname === "/owner/backups" ? "app.backups" : pathname === "/owner/customization" || pathname === "/owner/settings" ? "app.settings" : "host.title") as MessageKey;
  if (!session) return null;
  const mode = session.device.mode;
  const isOwner = session.user?.role === "Owner";
  const showOperational =
    mode === "Cashier" ||
    mode === "Scanner" ||
    mode === "Public Kiosk";
  const showOverview =
    mode !== "Public Kiosk" &&
    (mode === "Owner Dashboard" || session.user?.role === "Owner");
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
          {venue.data?.logoUrl ? <img src={venue.data.logoUrl} alt={venue.data.venueName} className="size-7 shrink-0 rounded border object-cover group-data-[collapsible=icon]:size-5" /> : <LayoutDashboard className="size-5 text-primary" />}
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {venue.data?.venueName ?? t("host.eyebrow")}
          </span>
        </SidebarHeader>
        <SidebarContent>
          {showOverview && (
            <SidebarGroup>
              <SidebarGroupLabel>{t("host.title")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link to="/" activeOptions={{ exact: true }} />}
                      isActive={active("/")}
                    >
                      <LayoutDashboard />
                      {t("app.overview")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {showOperational && (
            <SidebarGroup>
              <SidebarGroupLabel>{t("app.operations")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mode === "Cashier" && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton render={<Link to="/sales" />} isActive={active("/sales")}>
                          <ShoppingCart />
                          {t("app.sales")}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton render={<Link to="/sales-history" />} isActive={active("/sales-history")}>
                          <History />
                          {t("app.salesHistory")}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton render={<Link to="/members" />} isActive={active("/members")}>
                          <Users />
                          {t("app.members")}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}

                  {mode === "Scanner" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link to="/scanner" />} isActive={active("/scanner")}>
                        <ScanLine />
                        {t("app.scanner")}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {mode === "Public Kiosk" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link to="/kiosk" />} isActive={active("/kiosk")}>
                        <MonitorPlay />
                        {t("app.kiosk")}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {isOwner && (
            <SidebarGroup>
              <SidebarGroupLabel>{t("app.owner")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/devices" />} isActive={active("/owner/devices")}>
                      <Settings2 />
                      {t("app.devices")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/calendar" />} isActive={active("/owner/calendar")}>
                      <CalendarDays className="size-5" />
                      {t("app.calendar")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/packages" />} isActive={active("/owner/packages")}>
                      <PackageCheck />
                      {t("app.packages")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/catalog" />} isActive={active("/owner/catalog")}>
                      <Tags />
                      {t("app.catalog")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/inventory" />} isActive={active("/owner/inventory")}>
                      <PackageIcon />
                      {t("app.inventory")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link to="/owner/memberships" />}
                      isActive={active("/owner/memberships")}
                    >
                      <Users />
                      {t("app.memberships")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link to="/owner/membership-discounts" />}
                      isActive={active("/owner/membership-discounts")}
                    >
                      <Percent />
                      {t("app.membershipDiscounts")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/reports" />} isActive={active("/owner/reports")}>
                      <BarChart3 />
                      {t("app.reports")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/backups" />} isActive={active("/owner/backups")}>
                      <HardDrive />
                      {t("app.backups")}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/owner/settings" />} isActive={active("/owner/settings") || active("/owner/customization")}>
                      <Palette />
                      {t("app.settings" as MessageKey)}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="grid grid-cols-2 gap-1 group-data-[collapsible=icon]:hidden">
            <SoundPreference enabled={soundEnabled} onChange={setSoundEnabled} className="w-full" />
            <Button variant="outline" size="sm" className="w-full" onClick={() => setLocale(locale === "id" ? "en" : "id")}>
              {locale === "id" ? "EN" : "ID"}
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun data-icon="inline-start" /> : theme === "light" ? <Moon data-icon="inline-start" /> : <Monitor data-icon="inline-start" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={logout}>
              {t("auth.logout")}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <ConnectionBanner />
        <header className="flex min-h-12 items-center gap-3 border-b border-border px-3">
          <SidebarTrigger />
          <span className="truncate text-sm font-medium">
            {t(pageTitleKey)}
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-2 text-xs">
            <span className="max-w-40 truncate rounded-md bg-muted px-2 py-1 font-medium">
              {t(modeLabelKeys[mode] ?? "auth.modeCashier")}
            </span>
            {session.user && (
              <span className="max-w-28 truncate rounded-md border border-border px-2 py-1 font-medium">
                {session.user.role}
              </span>
            )}
          </div>
        </header>
        <NotificationAlerts />
        <Toaster />
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
