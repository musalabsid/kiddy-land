import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TicketScanner } from "@workspace/ui/components/ticket-scanner";
import { RouteAccessGate } from "@workspace/ui/components/route-access-guard";
import { Button } from "@workspace/ui/components/button";
import { useLocale } from "@workspace/ui/lib/i18n";

export const Route = createFileRoute("/_authenticated/_shell/scanner")({
  component: ScannerPage,
});

function ScannerPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState<"entry" | "exit">("entry");
  return (
    <RouteAccessGate requireMode="Scanner">
      <div className="grid gap-4">
        <div className="flex gap-2">
          <Button variant={tab === "entry" ? "default" : "outline"} onClick={() => setTab("entry")}>
            {t("scanner.entryTitle")}
          </Button>
          <Button variant={tab === "exit" ? "default" : "outline"} onClick={() => setTab("exit")}>
            {t("scanner.exitTitle")}
          </Button>
        </div>
        {tab === "entry" ? <TicketScanner kind="entry" enableCamera /> : <TicketScanner kind="exit" enableCamera />}
      </div>
    </RouteAccessGate>
  );
}
