import { createFileRoute } from "@tanstack/react-router";
import { CashierSale } from "@workspace/ui/components/cashier-sale";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/sales")({
  component: SalesPage,
});

function SalesPage() {
  return (
    <RouteAccessGate requireMode="Cashier">
      <div className="w-full max-w-6xl px-5 py-8 sm:px-8">
        <CashierSale />
      </div>
    </RouteAccessGate>
  );
}
