import { createFileRoute } from "@tanstack/react-router";
import { HostOverviewPage } from "@workspace/ui/components/host-overview-page";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { createHttpHostSource } from "@workspace/ui/lib/host";

const origin =
  import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
export const Route = createFileRoute("/_authenticated/_shell/")({
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <HostOverviewPage source={createHttpHostSource(origin)} origin={origin} />
    </RouteAccessGate>
  );
}
