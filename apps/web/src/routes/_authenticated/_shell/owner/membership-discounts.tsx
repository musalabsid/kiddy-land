import { createFileRoute } from "@tanstack/react-router";
import { MembershipDiscountSettings } from "@workspace/ui/components/membership-discount-settings";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute(
  "/_authenticated/_shell/owner/membership-discounts",
)({
  component: MembershipDiscountsPage,
});

function MembershipDiscountsPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <MembershipDiscountSettings />
    </RouteAccessGate>
  );
}
