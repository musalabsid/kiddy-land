import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useClient } from "./client-context";
import { useLogout } from "./query/hooks";

export type BackupInterval = "off" | "6h" | "12h" | "daily" | "weekly";
export type VenueTheme =
  | "monochrome"
  | "emerald"
  | "pastel"
  | "violet"
  | "ocean";
export type VenueSettings = {
  venueName: string;
  logoUrl: string | null;
  backupInterval: BackupInterval;
  theme: VenueTheme;
  alertEnabled: boolean;
  alertThreshold: number;
  alertDevices: Array<"Owner" | "Cashier" | "Kiosk">;
  nameCalling: boolean;
  bulkTicketEnabled: boolean;
  maxTicketsPerSale: number;
  alertTextDefault: string;
  alertTextName: string;
  alertEndedEnabled: boolean;
  alertEndedTextDefault: string;
  alertEndedTextName: string;
};
export type PublicVenue = Pick<
  VenueSettings,
  | "venueName"
  | "logoUrl"
  | "theme"
  | "alertEnabled"
  | "alertThreshold"
  | "alertDevices"
  | "nameCalling"
  | "bulkTicketEnabled"
  | "maxTicketsPerSale"
  | "alertTextDefault"
  | "alertTextName"
  | "alertEndedEnabled"
  | "alertEndedTextDefault"
  | "alertEndedTextName"
>;

export function useVenueSettings() {
  const client = useClient();
  const logout = useLogout();
  return useQuery({
    queryKey: ["venue-settings"],
    queryFn: async () => {
      try {
        return await client.get<VenueSettings>("/venue/settings");
      } catch (e) {
        if (
          e instanceof Error &&
          "status" in e &&
          (e as { status: number }).status === 401
        )
          logout();
        throw e;
      }
    },
  });
}
export function usePublicVenue() {
  const client = useClient();
  return useQuery({
    queryKey: ["public-venue"],
    queryFn: () => client.get<PublicVenue>("/public/venue"),
    staleTime: 60_000,
  });
}
export function useUpdateVenueSettings() {
  const client = useClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<VenueSettings>) =>
      client.put<VenueSettings>("/venue/settings", patch),
    onSuccess: (data) => {
      qc.setQueryData(["venue-settings"], data);
      qc.setQueryData(["public-venue"], {
        venueName: data.venueName,
        logoUrl: data.logoUrl,
        theme: data.theme,
        alertEnabled: data.alertEnabled,
        alertThreshold: data.alertThreshold,
        alertDevices: data.alertDevices,
        nameCalling: data.nameCalling,
        bulkTicketEnabled: data.bulkTicketEnabled,
        maxTicketsPerSale: data.maxTicketsPerSale,
      });
    },
  });
}
