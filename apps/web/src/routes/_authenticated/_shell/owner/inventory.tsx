import { createFileRoute } from "@tanstack/react-router";
import { OwnerInventory } from "@workspace/ui/components/owner-inventory";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/inventory")({
  component: OwnerInventoryPage,
});

function OwnerInventoryPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <OwnerInventory />
    </RouteAccessGate>
  );
}
