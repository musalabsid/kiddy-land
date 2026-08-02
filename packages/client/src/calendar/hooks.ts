import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClient } from "../client-context";
import { clientQueryKeys } from "../query/query-client";
import type { CalendarConfig, CalendarConfigureInput, EffectiveSchedule } from "./types";

export function useCalendarConfig() {
  const client = useClient();
  return useQuery({ queryKey: clientQueryKeys.calendarConfig, queryFn: () => client.get<CalendarConfig>("/calendar/config") });
}

export function useSchedule(date: string) {
  const client = useClient();
  return useQuery({ queryKey: [...clientQueryKeys.calendarSchedule, date], queryFn: () => client.get<EffectiveSchedule>(`/calendar/schedule?date=${encodeURIComponent(date)}`), enabled: Boolean(date) });
}

export function useConfigureCalendar() {
  const client = useClient();
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: CalendarConfigureInput) => client.post<{ ok: true }>("/calendar/configure", input), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: clientQueryKeys.calendarConfig }); } });
}

export type * from "./types";
