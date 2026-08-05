import { createFileRoute } from "@tanstack/react-router";
import { PublicKiosk } from "@workspace/ui/components/public-kiosk";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/kiosk")({
  component: KioskPage,
});

function KioskPage() {
  return (
    <RouteAccessGate requireMode="Public Kiosk">
      <PublicKiosk />
    </RouteAccessGate>
  );
}
