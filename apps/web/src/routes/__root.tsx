import { ThemeProvider } from "#/components/layout/theme-provider";
import { LocaleProvider } from "@workspace/ui/lib/i18n";
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
      <LocaleProvider>
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
      </LocaleProvider>
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
