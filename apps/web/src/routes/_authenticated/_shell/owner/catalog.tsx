import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalog } from "@workspace/ui/components/product-catalog";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/catalog")({
  component: CatalogPage,
});

function CatalogPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <ProductCatalog />
    </RouteAccessGate>
  );
}
