import { createFileRoute } from "@tanstack/react-router";
import { VenueCustomization } from "@workspace/ui/components/venue-customization";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/settings")({
  component: CustomizationPage,
});

function CustomizationPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <VenueCustomization />
    </RouteAccessGate>
  );
}
