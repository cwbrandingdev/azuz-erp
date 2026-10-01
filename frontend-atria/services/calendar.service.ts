import { apiRequest } from "./api";
import { deleteTask } from "./kanban.service";
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  TeamMember,
  UpdateCalendarEventInput,
} from "./types";

export async function getTeamMembers(): Promise<TeamMember[]> {
  return apiRequest<TeamMember[]>("/calendar/members");
}

export async function getEvents(params?: {
  from?: string;
  to?: string;
  clientId?: string;
}): Promise<CalendarEvent[]> {
  const query = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return apiRequest<CalendarEvent[]>(
    `/calendar/events${query ? `?${query}` : ""}`,
  );
}

export async function createEvent(
  data: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>("/calendar/events", {
    method: "POST",
    body: {
      ...data,
      category: data.category?.toUpperCase(),
    },
  });
}

export async function updateEvent(
  id: string,
  data: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = { ...data };
  if (data.category) body.category = data.category.toUpperCase();
  if (data.status) body.status = data.status.toUpperCase();

  return apiRequest<CalendarEvent>(`/calendar/events/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteEvent(id: string): Promise<void> {
  if (id.startsWith("task:")) {
    const taskId = id.slice("task:".length);
    return deleteTask(taskId);
  }

  return apiRequest<void>(`/calendar/events/${id}`, { method: "DELETE" });
}
