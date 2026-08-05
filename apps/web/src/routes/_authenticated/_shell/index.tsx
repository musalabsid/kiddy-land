import { createFileRoute } from "@tanstack/react-router";
import { HostOverviewPage } from "@workspace/ui/components/host-overview-page";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { createHttpHostSource } from "@workspace/ui/lib/host";
import { DEFAULT_ORIGIN } from "../../../lib/origin";

export const Route = createFileRoute("/_authenticated/_shell/")({
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <HostOverviewPage source={createHttpHostSource(DEFAULT_ORIGIN)} origin={DEFAULT_ORIGIN} />
    </RouteAccessGate>
  );
}
