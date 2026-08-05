import { createFileRoute } from "@tanstack/react-router";
import { DeviceManagement } from "@workspace/ui/components/device-management";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

const origin =
  import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
export const Route = createFileRoute("/_authenticated/_shell/owner/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <DeviceManagement origin={origin} />
    </RouteAccessGate>
  );
}
