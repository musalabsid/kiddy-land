import { createFileRoute } from "@tanstack/react-router";
import { ReportsDashboard } from "@workspace/ui/components/reports-dashboard";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <ReportsDashboard />
    </RouteAccessGate>
  );
}
