import { apiRequest } from "./api";
import type {
  CreateManualTimeClockEntryInput,
  MyTimeClock,
  TeamTimeClock,
  TeamTimeClockQuery,
  TimeClockEntry,
  TimeClockEntryType,
  TimeClockRangeQuery,
  UpdateTimeClockEntryInput,
} from "./types";

function toQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function punch(type: TimeClockEntryType): Promise<TimeClockEntry> {
  return apiRequest<TimeClockEntry>("/time-clock/punch", {
    method: "POST",
    body: { type },
  });
}

export async function getMyTimeClock(
  query: TimeClockRangeQuery = {},
): Promise<MyTimeClock> {
  return apiRequest<MyTimeClock>(`/time-clock/me${toQueryString({ ...query })}`);
}

export async function getTeamTimeClock(
  query: TeamTimeClockQuery = {},
): Promise<TeamTimeClock> {
  return apiRequest<TeamTimeClock>(`/time-clock${toQueryString({ ...query })}`);
}

export async function createManualEntry(
  data: CreateManualTimeClockEntryInput,
): Promise<TimeClockEntry> {
  return apiRequest<TimeClockEntry>("/time-clock/entries", {
    method: "POST",
    body: data,
  });
}

export async function updateEntry(
  id: string,
  data: UpdateTimeClockEntryInput,
): Promise<TimeClockEntry> {
  return apiRequest<TimeClockEntry>(`/time-clock/entries/${id}`, {
    method: "PATCH",
    body: data,
  });
}
