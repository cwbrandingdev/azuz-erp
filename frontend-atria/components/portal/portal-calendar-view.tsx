"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FORMAT_LABELS,
  PLATFORM_LABELS,
} from "@/lib/report-utils";
import type {
  ClientPortalCalendar,
  ClientPortalCalendarContent,
  ClientPortalCalendarEvent,
} from "@/services/client-portal.service";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const CATEGORY_LABELS: Record<string, string> = {
  meeting: "Reunião",
  deadline: "Prazo",
  publish: "Publicação",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Em aprovação",
  approved: "Aprovado",
  rejected: "Ajustes",
};

function formatCalendarContentStatus(status: string) {
  return STATUS_LABELS[status] ?? "Conteúdo";
}

function isPostCalendarItem(item: CalendarItem) {
  if (item.type === "content") return true;
  return item.category === "publish" || Boolean(item.contentPostId);
}

function formatCalendarItemMeta(item: CalendarItem) {
  if (item.type === "content") {
    return `${PLATFORM_LABELS[item.platform as keyof typeof PLATFORM_LABELS] ?? item.platform} · ${FORMAT_LABELS[item.format as keyof typeof FORMAT_LABELS] ?? item.format} · ${formatCalendarContentStatus(item.status)}`;
  }

  const parts: string[] = [];

  if (!isPostCalendarItem(item)) {
    parts.push(
      new Date(item.startAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }

  if (item.description) {
    parts.push(item.description);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type CalendarItem =
  | (ClientPortalCalendarEvent & { sortAt: Date })
  | (ClientPortalCalendarContent & { sortAt: Date });

interface PortalCalendarViewProps {
  loadCalendar: (from: string, to: string) => Promise<ClientPortalCalendar>;
}

export function PortalCalendarView({ loadCalendar }: PortalCalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<ClientPortalCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const range = useMemo(() => {
    const from = startOfMonth(cursor);
    const to = endOfMonth(cursor);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [cursor]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadCalendar(range.from, range.to);
      setData(result);
    } catch {
      setData({ events: [], content: [] });
    } finally {
      setLoading(false);
    }
  }, [loadCalendar, range.from, range.to]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    if (!data) return map;

    const contentPostIds = new Set(data.content.map((post) => post.id));

    for (const event of data.events) {
      if (event.contentPostId && contentPostIds.has(event.contentPostId)) {
        continue;
      }

      const sortAt = new Date(event.startAt);
      const key = dayKey(sortAt);
      const list = map.get(key) ?? [];
      list.push({ ...event, sortAt });
      map.set(key, list);
    }
    for (const post of data.content) {
      const sortAt = new Date(post.scheduledDate);
      const key = dayKey(sortAt);
      const list = map.get(key) ?? [];
      list.push({ ...post, sortAt });
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());
    }
    return map;
  }, [data]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = endOfMonth(cursor).getDate();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const selectedItems = selectedDay
    ? itemsByDay.get(dayKey(selectedDay)) ?? []
    : [];

  const monthLabel = cursor.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card data-tour="portal-calendar-month" className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-[var(--atria-primary)]" />
            <h2 className="text-lg font-semibold capitalize text-[var(--atria-primary)]">
              {monthLabel}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCursor(startOfMonth(new Date()))}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
          </div>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-16" />;
                }
                const items = itemsByDay.get(dayKey(date)) ?? [];
                const isSelected = selectedDay
                  ? sameDay(date, selectedDay)
                  : false;
                const isToday = sameDay(date, new Date());

                return (
                  <button
                    key={dayKey(date)}
                    type="button"
                    onClick={() => setSelectedDay(date)}
                    className={cn(
                      "min-h-16 rounded-xl border p-1.5 text-left transition-colors",
                      isSelected
                        ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5"
                        : "border-transparent hover:bg-[var(--atria-primary)]/[0.03]",
                      isToday && !isSelected && "border-[var(--atria-accent)]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                        isToday
                          ? "bg-[var(--atria-primary)] text-white"
                          : "text-[var(--atria-primary)]",
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {items.slice(0, 2).map((item) => (
                        <span
                          key={`${item.type}-${item.id}`}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[9px] font-medium",
                            item.type === "content"
                              ? "bg-[var(--atria-accent)]/40 text-[var(--atria-primary)]"
                              : "bg-[var(--atria-primary)]/10 text-[var(--atria-primary)]",
                          )}
                        >
                          {item.title}
                        </span>
                      ))}
                      {items.length > 2 && (
                        <span className="px-1 text-[9px] text-[var(--atria-primary)]/45">
                          +{items.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Card data-tour="portal-calendar-day" className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
          {selectedDay
            ? selectedDay.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })
            : "Selecione um dia"}
        </h3>
        <div className="mt-4 flex flex-col gap-3">
          {selectedItems.length === 0 ? (
            <p className="text-sm text-[var(--atria-primary)]/50">
              Nenhum conteúdo ou marco neste dia.
            </p>
          ) : (
            selectedItems.map((item) => {
              const meta = formatCalendarItemMeta(item);

              return (
              <div
                key={`${item.type}-${item.id}`}
                className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-base,#F8F8F6)] p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
                  {item.type === "content"
                    ? "Conteúdo"
                    : CATEGORY_LABELS[item.category] ?? "Evento"}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--atria-primary)]">
                  {item.title}
                </p>
                {meta ? (
                  <p className="mt-1 text-xs text-[var(--atria-primary)]/55">
                    {meta}
                  </p>
                ) : null}
              </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
