import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { AuthScreen } from "@workspace/ui/components/auth-screen";

import { DEFAULT_ORIGIN } from "../lib/origin";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AuthScreen origin={DEFAULT_ORIGIN} enableScanner>
      <Outlet />
    </AuthScreen>
  );
}
