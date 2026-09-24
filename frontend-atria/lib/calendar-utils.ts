import type {
  CalendarEvent,
  CalendarEventClient,
  KanbanTask,
  KanbanTaskStatus,
  ProductionPhase,
} from "@/services/types";
import { DEFAULT_PRODUCTION_PHASE } from "@/lib/production-phase";
import { contentTypeRequiresScript } from "@/lib/task-content-type";

export type CalendarView = "day" | "week" | "month";

export const CALENDAR_MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const CALENDAR_WEEKDAY_SHORT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

export const CALENDAR_WEEKDAY_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const DAY_VIEW_HOURS = Array.from({ length: 24 }, (_, i) => i);

export function getEventTaskStatus(
  event: Pick<CalendarEvent, "taskStatus" | "task">,
): KanbanTaskStatus | null {
  return event.taskStatus ?? event.task?.status ?? null;
}

export function getEventProductionPhase(
  event: Pick<CalendarEvent, "productionPhase" | "task">,
): ProductionPhase | null {
  return event.productionPhase ?? event.task?.productionPhase ?? null;
}

export function canChangeEventProductionPhase(
  event: Pick<
    CalendarEvent,
    "kanbanTaskId" | "taskStatus" | "task" | "productionPhase"
  >,
): boolean {
  if (!event.kanbanTaskId) return false;
  if (getEventTaskStatus(event) !== "falta_gravar") return false;
  return contentTypeRequiresScript(event.task?.contentType);
}

export function getEventProductionPhaseOrDefault(
  event: Pick<CalendarEvent, "productionPhase" | "task">,
): ProductionPhase {
  return getEventProductionPhase(event) ?? DEFAULT_PRODUCTION_PHASE;
}

export const CLIENT_CALENDAR_COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#3B82F6",
  "#F97316",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#6366F1",
  "#14B8A6",
  "#EF4444",
] as const;

export function getClientCalendarColor(clientId: string) {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLIENT_CALENDAR_COLORS[Math.abs(hash) % CLIENT_CALENDAR_COLORS.length];
}

export function getEventDisplayColor(event: {
  color: string;
  taskStatusColor?: string | null;
  client?: { color?: string } | null;
  assignee?: { color?: string } | null;
}) {
  if (event.taskStatusColor) return event.taskStatusColor;
  return event.client?.color ?? event.assignee?.color ?? event.color;
}

export function getEventCardAccent(event: {
  color: string;
  taskStatusColor?: string | null;
  client?: { color?: string } | null;
  assignee?: { color?: string } | null;
}) {
  const accent = getEventDisplayColor(event);
  return {
    accent,
    backgroundColor: `${accent}14`,
    borderColor: `${accent}45`,
    borderLeftColor: accent,
  };
}

export const CATEGORY_LABELS = {
  meeting: "Reunião",
  deadline: "Prazo",
  publish: "Publicação",
  other: "Outro",
} as const;

export function formatEventDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatEventTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatEventDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventClock(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type CalendarEventScheduleSource = {
  startAt: string;
  endAt: string;
  publicationDate?: string | null;
  task?: {
    publicationDate?: string | null;
    deliveryDate?: string | null;
    dueDate?: string | null;
  } | null;
};

export function getEventPublicationAt(event: CalendarEventScheduleSource) {
  return event.task?.publicationDate ?? event.publicationDate ?? event.startAt;
}

export function getEventDeliveryAt(event: CalendarEventScheduleSource) {
  return event.task?.deliveryDate ?? event.task?.dueDate ?? event.endAt;
}

export function formatEventScheduleDetail(
  event: CalendarEventScheduleSource,
  mode: "compact" | "full" = "full",
) {
  const publicationAt = getEventPublicationAt(event);
  const deliveryAt = getEventDeliveryAt(event);
  const publicationLabel = `Pub. ${formatEventClock(publicationAt)}`;
  if (mode === "compact" || deliveryAt === publicationAt) {
    return publicationLabel;
  }
  return `${publicationLabel} · Ent. ${formatEventClock(deliveryAt)}`;
}

export function isValidReferenceUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getMondayWeekStart(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function getWeekDays(date: Date) {
  const monday = getMondayWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

export function getViewDateRange(view: CalendarView, anchor: Date) {
  if (view === "day") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }

  if (view === "week") {
    const weekDays = getWeekDays(anchor);
    return {
      from: startOfDay(weekDays[0]),
      to: endOfDay(weekDays[6]),
    };
  }

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  return {
    from: startOfDay(new Date(year, month, 1)),
    to: endOfDay(new Date(year, month + 1, 0)),
  };
}

export function getClientDisplayName(
  client: CalendarEventClient | null | undefined,
  fallback = "",
) {
  if (!client) return fallback;
  const named = client as CalendarEventClient & { name?: string };
  return named.name?.trim() || client.companyName || fallback;
}

export function getEventHoverLabel(
  event: CalendarEventScheduleSource & {
    title: string;
    client?: CalendarEventClient | null;
  },
) {
  const clientName = event.client
    ? getClientDisplayName(event.client, event.title)
    : "";
  const heading = clientName ? `${clientName} · ${event.title}` : event.title;
  return [
    heading,
    `Data de Publicação: ${formatEventDateTime(getEventPublicationAt(event))}`,
    `Data de Entrega: ${formatEventDateTime(getEventDeliveryAt(event))}`,
  ].join("\n");
}

export function getClientInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function calendarEventFromTask(task: KanbanTask): CalendarEvent {
  const publicationDate =
    task.publicationDate ?? task.dueDate ?? new Date().toISOString();
  const deliveryDate = task.deliveryDate ?? task.dueDate ?? publicationDate;

  return {
    id: task.calendarEventId ?? `task:${task.id}`,
    title: task.title,
    description: task.description,
    publicationDate,
    startAt: publicationDate,
    endAt: deliveryDate,
    category: "deadline",
    color: task.statusColor,
    referenceUrl: task.referenceUrl,
    isPending: false,
    kanbanTaskId: task.id,
    taskStatus: task.status,
    taskStatusColor: task.statusColor,
    productionPhase: task.productionPhase,
    task: {
      id: task.id,
      status: task.status,
      productionPhase: task.productionPhase,
      contentType: task.contentType,
      statusColor: task.statusColor,
      statusLabel: task.statusLabel,
      publicationDate: task.publicationDate ?? null,
      deliveryDate: task.deliveryDate ?? task.dueDate ?? null,
      dueDate: task.dueDate,
    },
    clientId: task.clientId,
    client: task.client
      ? {
          id: task.client.id,
          name: task.client.companyName,
          companyName: task.client.companyName,
          avatarUrl: task.client.avatarUrl,
          color: task.statusColor,
        }
      : null,
    createdBy: task.createdBy,
    assignee: task.assignees[0] ?? null,
    assignedGroupId: task.assignedGroupId,
    assignedGroup: task.assignedGroup,
  };
}

export function overlayTaskOnCalendarEvent(
  event: CalendarEvent,
  task: KanbanTask,
): CalendarEvent {
  return {
    ...event,
    taskStatus: task.status,
    productionPhase: task.productionPhase,
    taskStatusColor: task.statusColor,
    color: task.statusColor,
    publicationDate: task.publicationDate ?? event.publicationDate ?? event.startAt,
    task: {
      id: task.id,
      status: task.status,
      productionPhase: task.productionPhase,
      contentType: task.contentType,
      statusColor: task.statusColor,
      statusLabel: task.statusLabel,
      publicationDate: task.publicationDate ?? null,
      deliveryDate: task.deliveryDate ?? task.dueDate ?? null,
      dueDate: task.dueDate,
    },
  };
}

export function mergeCalendarEventsWithTasks(
  events: CalendarEvent[],
  tasks: KanbanTask[],
): CalendarEvent[] {
  const eventsByTaskId = new Map<string, CalendarEvent>();
  const eventIds = new Set<string>();

  for (const event of events) {
    eventIds.add(event.id);
    if (event.kanbanTaskId) {
      eventsByTaskId.set(event.kanbanTaskId, event);
    }
  }

  const merged = events
    .map((event) => {
      if (!event.kanbanTaskId) return event;
      const task = tasks.find((entry) => entry.id === event.kanbanTaskId);
      if (!task) return null;
      return overlayTaskOnCalendarEvent(event, task);
    })
    .filter((event): event is CalendarEvent => event !== null);

  const extras: CalendarEvent[] = [];
  for (const task of tasks) {
    if (!task.publicationDate) continue;
    if (eventsByTaskId.has(task.id)) continue;
    if (task.calendarEventId && eventIds.has(task.calendarEventId)) continue;
    extras.push(calendarEventFromTask(task));
  }

  return extras.length > 0 ? [...merged, ...extras] : merged;
}
