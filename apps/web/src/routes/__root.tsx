import { ThemeProvider } from "@workspace/ui/providers/theme-provider";
import { LocaleProvider } from "@workspace/ui/lib/i18n";
import { ClientProvider } from "@kiddy-land/client/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute } from "@tanstack/react-router";

import "../styles.css";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <ClientProvider origin={import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117"}>
        <LocaleProvider>
          <ThemeProvider>
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
