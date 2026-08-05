import { ClientProvider, useSession } from "@kiddy-land/client/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { LocaleProvider } from "@workspace/ui/lib/i18n";

import "../styles.css";
import { ThemeProvider } from "@workspace/ui/providers/theme-provider";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <ClientProvider
        origin={
          import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117"
        }
      >
        <LocaleProvider>
          <ThemeProvider>
            <SessionRefresh />
            <Outlet />
          </ThemeProvider>
        </LocaleProvider>
      </ClientProvider>
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}

function SessionRefresh() {
  useSession();
  return null;
}
