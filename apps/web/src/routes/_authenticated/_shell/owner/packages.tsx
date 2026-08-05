import { createFileRoute } from "@tanstack/react-router";
import { TicketPackageSettings } from "@workspace/ui/components/ticket-package-settings";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  return <RouteAccessGate requireRole="Owner"><TicketPackageSettings /></RouteAccessGate>;
}
