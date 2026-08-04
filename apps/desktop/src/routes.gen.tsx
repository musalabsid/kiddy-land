import { createRootRoute, createRoute } from "@tanstack/react-router";
import { AuthScreen, OwnerLoginScreen } from "@workspace/ui/components/auth-screen";
import { HostDashboard } from "@workspace/ui/components/host-dashboard";
import { ConnectionBanner } from "@workspace/ui/components/connection-banner";
import { ClientProvider } from "@kiddy-land/client/react";
import { LocaleProvider } from "@kiddy-land/localization/react";
import { ThemeProvider } from "@workspace/ui/providers/theme-provider";
import { createHttpHostSource } from "@workspace/ui/lib/host";
import { invoke } from "@tauri-apps/api/core";
import "@workspace/ui/globals.css";

const origin = import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const source = createHttpHostSource(origin);
const stop = async () => { await invoke("stop_host"); };
const rootRoute = createRootRoute({ component: () => <ClientProvider origin={origin}><LocaleProvider><ThemeProvider><ConnectionBanner /><Outlet /></ThemeProvider></LocaleProvider></ClientProvider> });
const appRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => <AuthScreen origin={origin}><HostDashboard source={source} origin={origin} onStop={stop} /></AuthScreen> });
const ownerLoginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/owner-login", component: () => <AuthScreen origin={origin}><OwnerLoginScreen /></AuthScreen> });
export const routeTree = rootRoute.addChildren([appRoute, ownerLoginRoute]);
import { Outlet } from "@tanstack/react-router";
