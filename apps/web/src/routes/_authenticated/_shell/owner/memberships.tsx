import { createFileRoute } from "@tanstack/react-router";
import { MembershipDashboard } from "@workspace/ui/components/membership-dashboard";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute(
  "/_authenticated/_shell/owner/memberships",
)({
  component: MembershipsPage,
});

function MembershipsPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <MembershipDashboard />
    </RouteAccessGate>
  );
}
