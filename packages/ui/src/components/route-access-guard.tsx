import type { DeviceMode } from "@kiddy-land/client";
import { useSession } from "@kiddy-land/client/react";
import { useAuthStore } from "@kiddy-land/client/react";
import { useLocale } from "@workspace/ui/lib/i18n";
import type { ReactNode } from "react";

export const modeDefaultRoutes: Record<DeviceMode, string> = {
  Cashier: "/sales",
  Inventory: "/inventory",
  "Entrance Scanner": "/scanner/entry",
  "Exit Scanner": "/scanner/exit",
  "Owner Dashboard": "/",
  "Public Kiosk": "/kiosk",
};

export function RouteAccessDenied() {
  const { t } = useLocale();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-5 text-center text-foreground">
      <p className="text-xl font-semibold tracking-tight">
        {t("access.denied")}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("access.deniedDescription")}
      </p>
    </main>
  );
}

export function useRouteAccess() {
  const { session, pairedDevice } = useSession();
  return {
    session,
    pairedDevice,
    hydrated: useAuthStore((state) => state.hydrated),
    loading: !useAuthStore((state) => state.hydrated),
    mode: session?.device.mode,
    role: session?.user?.role,
    isKiosk: session?.device.mode === "Public Kiosk",
    isOwner: session?.user?.role === "Owner",
  };
}

export function RouteAccessGate({
  requireMode,
  requireRole,
  allowCashier,
  children,
}: {
  requireMode?: DeviceMode;
  requireRole?: "Owner";
  allowCashier?: boolean;
  children: ReactNode;
}) {
  const { session, hydrated, mode, isOwner } = useRouteAccess();
  if (!hydrated || !session) return null;
  if (requireRole === "Owner" && !isOwner && !(allowCashier && mode === "Cashier")) return <RouteAccessDenied />;
  if (requireMode && mode !== requireMode) return <RouteAccessDenied />;
  return <>{children}</>;
}
