import { createFileRoute } from "@tanstack/react-router";
import { CashierSale } from "@workspace/ui/components/cashier-sale";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/sales")({
  component: SalesPage,
});

function SalesPage() {
  return (
    <RouteAccessGate requireMode="Cashier">
      <CashierSale enableCamera />
    </RouteAccessGate>
  );
}
