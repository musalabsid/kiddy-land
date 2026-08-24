import { createFileRoute } from "@tanstack/react-router";
import { CashierTodaySales } from "@workspace/ui/components/cashier-today-sales";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/sales-history")({
  component: () => (
    <RouteAccessGate requireMode="Cashier">
      <CashierTodaySales />
    </RouteAccessGate>
  ),
});
