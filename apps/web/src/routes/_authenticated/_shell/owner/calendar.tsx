import { createFileRoute } from "@tanstack/react-router";
import { CalendarSettings } from "@workspace/ui/components/calendar-settings";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";

export const Route = createFileRoute("/_authenticated/_shell/owner/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <RouteAccessGate requireRole="Owner">
      <CalendarSettings />
    </RouteAccessGate>
  );
}
