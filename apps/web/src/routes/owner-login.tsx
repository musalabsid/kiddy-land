import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OwnerLoginScreen } from "@workspace/ui/components/auth-screen";

export const Route = createFileRoute("/owner-login")({ component: OwnerLoginRoute });

function OwnerLoginRoute() {
  const navigate = useNavigate();
  return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6"><div className="w-full max-w-sm"><OwnerLoginScreen onSuccess={() => void navigate({ to: "/" })} /></div></main>;
}
