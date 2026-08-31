import { useClientConnection } from "@kiddy-land/client/react";
import { useLocale } from "@kiddy-land/localization/react";

export function ConnectionBanner() {
  const { t } = useLocale();
  const { state, synchronized } = useClientConnection();
  const key =
    state === "synchronized" && synchronized
      ? "auth.connected"
      : state === "disconnected"
        ? "auth.disconnected"
        : "auth.readOnly";
  return (
    <div
      className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground"
      role="status"
    >
      {t(key)}
    </div>
  );
}
