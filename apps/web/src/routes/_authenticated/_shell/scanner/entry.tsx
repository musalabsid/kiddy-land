import { createFileRoute } from "@tanstack/react-router";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { TicketScanner } from "@workspace/ui/components/ticket-scanner";

export const Route = createFileRoute("/_authenticated/_shell/scanner/entry")({
  component: EntryScannerPage,
});

function EntryScannerPage() {
  return (
    <RouteAccessGate requireMode="Entrance Scanner">
      <TicketScanner kind="entry" />
    </RouteAccessGate>
  );
}
