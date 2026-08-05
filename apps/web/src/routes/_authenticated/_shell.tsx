import { createFileRoute } from "@tanstack/react-router";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@workspace/ui/components/app-shell";
import {
  RouteAccessGate,
  useRouteAccess,
} from "@workspace/ui/components/route-access-guard";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: ShellLayout,
});

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
