import React from "react";
import ReactDOM from "react-dom/client";
import { HostDashboard } from "@workspace/ui/components/host-dashboard";
import { AuthScreen } from "@workspace/ui/components/auth-screen";
import { ConnectionBanner } from "@workspace/ui/components/connection-banner";
import { LocaleProvider } from "@kiddy-land/localization/react";
import { ThemeProvider } from "@workspace/ui/providers/theme-provider";
import { ClientProvider } from "@kiddy-land/client/react";
import { createHttpHostSource } from "@workspace/ui/lib/host";
import { invoke } from "@tauri-apps/api/core";
import "@workspace/ui/globals.css";

const origin = import.meta.env.VITE_LOCAL_SERVER_ORIGIN ?? "http://127.0.0.1:43117";
const source = createHttpHostSource(origin);
const stop = async () => { await invoke("stop_host"); };

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<React.StrictMode><ClientProvider origin={origin}><LocaleProvider><ThemeProvider><AuthScreen origin={origin}><ConnectionBanner /><HostDashboard source={source} origin={origin} onStop={stop} /></AuthScreen></ThemeProvider></LocaleProvider></ClientProvider></React.StrictMode>);
