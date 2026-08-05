import { createFileRoute } from "@tanstack/react-router";
import { InventoryDashboard } from "@workspace/ui/components/inventory-dashboard";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <RouteAccessGate requireMode="Inventory">
      <InventoryDashboard />
    </RouteAccessGate>
  );
}
