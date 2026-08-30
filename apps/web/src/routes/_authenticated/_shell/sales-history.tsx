import { createFileRoute } from "@tanstack/react-router";
import { CashierTodaySales } from "@workspace/ui/components/cashier-today-sales";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/sales-history")({
  component: () => (
    <RouteAccessGate requireMode="Cashier">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <CashierTodaySales />
      </div>
    </RouteAccessGate>
  ),
});
