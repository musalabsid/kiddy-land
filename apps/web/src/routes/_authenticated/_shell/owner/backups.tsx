import { createFileRoute } from "@tanstack/react-router";
import { BackupDashboard } from "@workspace/ui/components/backup-dashboard";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/backups")({
  component: BackupsPage,
});

function BackupsPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <BackupDashboard />
    </RouteAccessGate>
  );
}
