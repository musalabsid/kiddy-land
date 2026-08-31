import { createFileRoute } from "@tanstack/react-router";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { TicketPackageSettings } from "@workspace/ui/components/ticket-package-settings";

export const Route = createFileRoute("/_authenticated/_shell/owner/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <TicketPackageSettings />
    </RouteAccessGate>
  );
}
