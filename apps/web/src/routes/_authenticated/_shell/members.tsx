import { createFileRoute } from "@tanstack/react-router";
import { MembershipDashboard } from "@workspace/ui/components/membership-dashboard";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/members")({
  component: MembersPage,
});

function MembersPage() {
  return (
    <RouteAccessGate requireRole="Owner" allowCashier>
      <MembershipDashboard />
    </RouteAccessGate>
  );
}
