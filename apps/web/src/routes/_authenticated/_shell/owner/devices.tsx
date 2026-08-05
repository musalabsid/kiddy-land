import { createFileRoute } from "@tanstack/react-router";
import { DeviceManagement } from "@workspace/ui/components/device-management";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { DEFAULT_ORIGIN } from "../../../../lib/origin";

export const Route = createFileRoute("/_authenticated/_shell/owner/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <DeviceManagement origin={DEFAULT_ORIGIN} />
    </RouteAccessGate>
  );
}
