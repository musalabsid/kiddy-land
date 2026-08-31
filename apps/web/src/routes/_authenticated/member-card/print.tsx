import { createFileRoute } from "@tanstack/react-router";
import { MemberCardPrint } from "@workspace/ui/components/member-card-print";

export const Route = createFileRoute("/_authenticated/member-card/print")({
  component: MemberCardPrintPage,
});

function MemberCardPrintPage() {
  const search = new URLSearchParams(window.location.search);
  return (
    <MemberCardPrint
      name={search.get("name") ?? "Member"}
      code={search.get("code") ?? ""}
      phone={search.get("phone") || undefined}
    />
  );
}
