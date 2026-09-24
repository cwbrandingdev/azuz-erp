"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { calendarService, clientsService } from "@/services";
import type { CalendarEvent, Client, TeamMember } from "@/services/types";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTasks } from "@/hooks/use-tasks";
import {
  EMPTY_KANBAN_FILTERS,
  KanbanFilters,
  matchesNameSearch,
  type KanbanFiltersState,
} from "@/components/kanban/kanban-filters";
import { CreateEventDialog } from "./create-event-dialog";
import { CalendarEventStatusMenu } from "./calendar-event-status-menu";
import { EventDetailDialog } from "./event-detail-dialog";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarStatusLegend } from "./calendar-status-legend";
import { CalendarWeekView } from "./calendar-week-view";
import { Badge } from "@/components/ui/badge";
import {
  CALENDAR_MONTH_LABELS,
  type CalendarView,
  formatEventScheduleDetail,
  getEventPublicationAt,
  getViewDateRange,
  getWeekDays,
  mergeCalendarEventsWithTasks,
} from "@/lib/calendar-utils";
import { matchesEventRecordingFilter } from "@/lib/production-phase";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateTasksCache } from "@/lib/task-cache";

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
];

const EMPTY_FILTERS: KanbanFiltersState = EMPTY_KANBAN_FILTERS;

function getNavigationLabel(view: CalendarView, anchor: Date) {
  if (view === "day") {
    return anchor.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (view === "week") {
    const [start, end] = getWeekDays(anchor);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: sameMonth ? undefined : "short",
    });
    const endLabel = end.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  return `${CALENDAR_MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

export function TeamCalendar() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filters, setFilters] = useState<KanbanFiltersState>(EMPTY_FILTERS);
  const [onlyPending, setOnlyPending] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: tasks = [] } = useTasks();

  const anchorDate = view === "day" ? selectedDate : currentDate;
  const range = useMemo(
    () => getViewDateRange(view, anchorDate),
    [view, anchorDate],
  );

  const {
    data: fetchedEvents = [],
    isLoading: loading,
    refetch: refetchEvents,
  } = useCalendarEvents({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  useEffect(() => {
    void Promise.all([
      clientsService.getClients().catch(() => [] as Client[]),
      calendarService.getTeamMembers().catch(() => [] as TeamMember[]),
    ]).then(([clientList, team]) => {
      setClients(clientList);
      setMembers(team);
    });
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const events = useMemo(
    () => mergeCalendarEventsWithTasks(fetchedEvents, tasks),
    [fetchedEvents, tasks],
  );

  useEffect(() => {
    if (!detailOpen || !selectedEvent) return;
    const updated = events.find((entry) => entry.id === selectedEvent.id);
    if (updated) {
      setSelectedEvent(updated);
    }
  }, [detailOpen, events, selectedEvent?.id]);

  const filterClients = useMemo(() => {
    if (clients.length > 0) return clients;
    const byId = new Map<string, Client>();
    for (const task of tasks) {
      if (task.client) {
        byId.set(task.client.id, {
          id: task.client.id,
          companyName: task.client.companyName,
          avatarUrl: task.client.avatarUrl,
        } as Client);
      }
    }
    for (const evt of events) {
      if (evt.client) {
        byId.set(evt.client.id, {
          id: evt.client.id,
          companyName: evt.client.companyName,
          avatarUrl: evt.client.avatarUrl,
        } as Client);
      }
    }
    return Array.from(byId.values());
  }, [clients, tasks, events]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesSearch = matchesNameSearch(evt.title, filters.search);
      const matchesPending = onlyPending ? evt.isPending : true;
      if (!matchesSearch || !matchesPending) return false;

      const linkedTask = evt.kanbanTaskId
        ? tasks.find((task) => task.id === evt.kanbanTaskId)
        : undefined;

      if (filters.assigneeId) {
        const matchesTaskAssignee = linkedTask?.assignees.some(
          (assignee) => assignee.id === filters.assigneeId,
        );
        const matchesEventAssignee = evt.assignee?.id === filters.assigneeId;
        if (!matchesTaskAssignee && !matchesEventAssignee) {
          return false;
        }
      }

      if (filters.clientId) {
        const eventClientId = evt.clientId ?? linkedTask?.clientId ?? null;
        if (eventClientId !== filters.clientId) return false;
      }

      if (!matchesEventRecordingFilter(evt, filters.recordingFilter)) {
        return false;
      }

      return true;
    });
  }, [events, onlyPending, filters, tasks]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of filteredEvents) {
      const key = new Date(getEventPublicationAt(evt)).toDateString();
      const list = map.get(key) ?? [];
      list.push(evt);
      list.sort(
        (a, b) =>
          new Date(getEventPublicationAt(a)).getTime() -
          new Date(getEventPublicationAt(b)).getTime(),
      );
      map.set(key, list);
    }
    return map;
  }, [filteredEvents]);

  const refreshSyncedViews = useCallback(async () => {
    await invalidateTasksCache(queryClient);
    await refetchEvents();
  }, [queryClient, refetchEvents]);

  const openEventDetail = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  }, []);

  function navigatePrevious() {
    if (view === "day") {
      setSelectedDate(
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1),
      );
      return;
    }

    if (view === "week") {
      setCurrentDate(
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7),
      );
      return;
    }

    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function navigateNext() {
    if (view === "day") {
      setSelectedDate(
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      );
      return;
    }

    if (view === "week") {
      setCurrentDate(
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7),
      );
      return;
    }

    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setIsFullscreen(false);
    }
  }

  const selectedDayEvents =
    eventsByDay.get(selectedDate.toDateString()) ?? [];

  const showSelectedDayPanel = view !== "day" && !isFullscreen;

  return (
    <div
      data-calendar-root
      className={cn(
        "flex flex-col gap-6",
        isFullscreen && "h-screen max-h-screen overflow-hidden bg-[var(--atria-base)] p-4 lg:p-6",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/20 p-3 text-[var(--atria-primary)]">
            <CalendarIcon className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
                Calendário da Equipe
              </h1>
              <Badge
                variant="outline"
                className="border-[var(--atria-primary)]/15 bg-[var(--atria-accent)]/20 text-[11px] font-medium text-[var(--atria-primary)]/75"
              >
                Exibindo por Data de Publicação
              </Badge>
            </div>
            <p className="text-sm text-[var(--atria-primary)]/50">
              {getNavigationLabel(view, anchorDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-[var(--atria-primary)]/15 bg-white p-1">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === option.id
                    ? "bg-[var(--atria-primary)] text-white shadow-sm"
                    : "text-[var(--atria-primary)]/65 hover:text-[var(--atria-primary)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isFullscreen && (
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                aria-label="Buscar por nome"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="h-8 w-48 rounded-lg border border-[var(--atria-primary)]/20 bg-white pr-3 pl-9 text-sm"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setOnlyPending(!onlyPending)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              onlyPending
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-[var(--atria-primary)]/20 text-[var(--atria-primary)]/70",
            )}
          >
            <AlertCircle className="size-4" />
            Pendências
          </button>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="flex items-center gap-2 rounded-lg border border-[var(--atria-primary)]/20 px-3 py-1.5 text-sm font-medium text-[var(--atria-primary)]/70 transition-colors hover:border-[var(--atria-primary)]/35 hover:text-[var(--atria-primary)]"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="size-4" />
                Sair da tela cheia
              </>
            ) : (
              <>
                <Maximize2 className="size-4" />
                Tela cheia
              </>
            )}
          </button>

          <CreateEventDialog
            defaultDate={selectedDate}
            defaultClientId={filters.clientId || null}
            onSuccess={() => void refreshSyncedViews()}
          />
        </div>
      </div>

      {!isFullscreen && (
        <KanbanFilters
          filters={filters}
          onChange={setFilters}
          members={members}
          clients={filterClients}
        />
      )}

      <div
        className={cn(
          "flex min-h-0 flex-col rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4 shadow-sm sm:p-6",
          isFullscreen && "flex-1",
          (view === "week" || view === "day") && "min-h-[520px]",
        )}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={navigatePrevious}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Período anterior"
          >
            <ChevronLeft className="size-5 text-[var(--atria-primary)]" />
          </button>
          <h2 className="text-center font-semibold text-[var(--atria-primary)]">
            {getNavigationLabel(view, anchorDate)}
          </h2>
          <button
            type="button"
            onClick={navigateNext}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Próximo período"
          >
            <ChevronRight className="size-5 text-[var(--atria-primary)]" />
          </button>
        </div>

        <CalendarStatusLegend className="mb-4 shrink-0" />

        {view === "month" && (
          <CalendarMonthView
            currentDate={currentDate}
            selectedDate={selectedDate}
            eventsByDay={eventsByDay}
            loading={loading}
            onSelectDate={setSelectedDate}
            onOpenDetails={openEventDetail}
          />
        )}

        {view === "week" && (
          <CalendarWeekView
            anchorDate={currentDate}
            eventsByDay={eventsByDay}
            loading={loading}
            onOpenDetails={openEventDetail}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setView("day");
            }}
          />
        )}

        {view === "day" && (
          <CalendarDayView
            selectedDate={selectedDate}
            events={filteredEvents}
            loading={loading}
            onOpenDetails={openEventDetail}
          />
        )}
      </div>

      {showSelectedDayPanel && (
        <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6">
          <h3 className="mb-4 font-semibold text-[var(--atria-primary)]">
            {selectedDate.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-[var(--atria-primary)]/40">
              Nenhum evento neste dia.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayEvents.map((evt) => (
                <CalendarEventStatusMenu
                  key={evt.id}
                  event={evt}
                  onOpenDetails={openEventDetail}
                  compact={false}
                  className="w-full rounded-xl p-3"
                  detail={formatEventScheduleDetail(evt)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={() => void refreshSyncedViews()}
        onUpdated={() => void refreshSyncedViews()}
      />
    </div>
  );
}
