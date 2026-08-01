import { createFileRoute } from "@tanstack/react-router";
import { HostDashboard } from "@workspace/ui/components/host-dashboard";
import { createHttpHostSource } from "@workspace/ui/lib/host";

const origin = import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
export const Route = createFileRoute("/")({ component: WebHostDashboard });

function WebHostDashboard() {
  return <HostDashboard source={createHttpHostSource(origin)} origin={origin} />;
}
