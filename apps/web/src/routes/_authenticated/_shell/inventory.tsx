import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_shell/inventory")({
  beforeLoad: () => {
    throw redirect({ to: "/owner/inventory" });
  },
});
