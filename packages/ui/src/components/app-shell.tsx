import { useLogout, useSession } from "@kiddy-land/client/react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { NotificationAlerts, SoundPreference, useNotificationSound } from "@workspace/ui/components/notification-alerts";
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
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { useLocale } from "@workspace/ui/lib/i18n";
import { ConnectionBanner } from "@workspace/ui/components/connection-banner";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  HardDrive,
  LayoutDashboard,
  PackageIcon,
  Percent,
  ScanLine,
  Settings2,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

const modeLabelKeys: Record<
  string,
  | "auth.modeCashier"
  | "auth.modeEntrance"
  | "auth.modeExit"
  | "auth.modeInventory"
  | "auth.modeKiosk"
  | "auth.modeOwner"
> = {
  Cashier: "auth.modeCashier",
  "Entrance Scanner": "auth.modeEntrance",
  "Exit Scanner": "auth.modeExit",
  Inventory: "auth.modeInventory",
  "Public Kiosk": "auth.modeKiosk",
  "Owner Dashboard": "auth.modeOwner",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useLocale();
  const { session } = useSession();
  const { pathname } = useLocation();
  const logout = useLogout();
  const { soundEnabled, setSoundEnabled } = useNotificationSound();
  const active = (path: string) => pathname === path;
  if (!session) return null;
  const mode = session.device.mode;
  const isOwner = session.user?.role === "Owner";
  const showOperational =
    mode === "Cashier" ||
    mode === "Inventory" ||
    mode === "Entrance Scanner" ||
    mode === "Exit Scanner";
  const showOverview =
    mode !== "Public Kiosk" &&
    (mode === "Owner Dashboard" || session.user?.role === "Owner");
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
          <LayoutDashboard className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {t("host.eyebrow")}
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
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link to="/sales" />} isActive={active("/sales")}>
                        <ShoppingCart />
                        {t("app.sales")}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {mode === "Inventory" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link to="/inventory" />} isActive={active("/inventory")}>
                        <PackageIcon />
                        {t("app.inventory")}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {mode === "Entrance Scanner" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link to="/scanner/entry" />} isActive={active("/scanner/entry")}>
                        <ScanLine />
                        {t("app.entryScanner")}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {mode === "Exit Scanner" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton render={<Link to="/scanner/exit" />} isActive={active("/scanner/exit")}>
                        <ScanLine />
                        {t("app.exitScanner")}
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
                      <CalendarDays />
                      {t("app.calendar")}
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
                      <Boxes />
                      {t("app.ownerInventory")}
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
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <span className="truncate">
              {t("app.mode")}: {t(modeLabelKeys[mode] ?? "auth.modeCashier")}
            </span>
            <span className="truncate">
              {session.user ? `${t("app.role")}: ${session.user.role}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 group-data-[collapsible=icon]:hidden">
            <SoundPreference enabled={soundEnabled} onChange={setSoundEnabled} className="w-fit" />
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setLocale(locale === "id" ? "en" : "id")}>
              {locale === "id" ? "EN" : "ID"}
            </Button>
            <Button variant="outline" size="sm" className="w-fit" onClick={logout}>
              {t("auth.logout")}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <ConnectionBanner />
        <header className="flex h-12 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger />
          <span className="truncate text-sm font-medium">
            {t("host.title")}
          </span>
        </header>
        <NotificationAlerts />
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
