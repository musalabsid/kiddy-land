import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@workspace/ui/components/app-shell";
import { modeDefaultRoutes, RouteAccessGate, useRouteAccess } from "@workspace/ui/components/route-access-guard";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { isKiosk, mode } = useRouteAccess();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (isKiosk) {
      void navigate({ to: "/kiosk", replace: true });
      return;
    }
    if (location.pathname === "/" && mode && mode !== "Owner Dashboard") {
      void navigate({ to: modeDefaultRoutes[mode] as never, replace: true });
    }
  }, [isKiosk, location.pathname, mode, navigate]);
  if (isKiosk || (location.pathname === "/" && mode && mode !== "Owner Dashboard")) return null;
  return (
    <RouteAccessGate>
      <AppShell>
        <Outlet />
      </AppShell>
    </RouteAccessGate>
  );
}
