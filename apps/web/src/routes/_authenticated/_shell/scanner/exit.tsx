import { createFileRoute } from "@tanstack/react-router";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { TicketScanner } from "@workspace/ui/components/ticket-scanner";

export const Route = createFileRoute("/_authenticated/_shell/scanner/exit")({
  component: ExitScannerPage,
});

function ExitScannerPage() {
  return (
    <RouteAccessGate requireMode="Exit Scanner">
      <TicketScanner kind="exit" />
    </RouteAccessGate>
  );
}
