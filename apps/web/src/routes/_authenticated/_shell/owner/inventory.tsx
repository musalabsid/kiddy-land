import { createFileRoute } from "@tanstack/react-router";
import { InventoryDashboard } from "@workspace/ui/components/inventory-dashboard";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <InventoryDashboard />
    </RouteAccessGate>
  );
}
