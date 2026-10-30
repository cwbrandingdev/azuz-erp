"use client";

import type { CalendarEvent } from "@/services/types";
import {
  CALENDAR_WEEKDAY_LONG,
  formatEventScheduleDetail,
  getWeekDays,
  isSameDay,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { CalendarDayDropZone } from "./calendar-day-drop-zone";
import { CalendarDraggableEvent } from "./calendar-draggable-event";
import { CalendarEventStatusMenu } from "./calendar-event-status-menu";

interface CalendarWeekViewProps {
  anchorDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  loading: boolean;
  onOpenDetails: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
  canDragEvent: (event: CalendarEvent) => boolean;
}

export function CalendarWeekView({
  anchorDate,
  eventsByDay,
  loading,
  onOpenDetails,
  onSelectDate,
  canDragEvent,
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(anchorDate);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, new Date());
            const weekdayIndex = day.getDay();

            return (
              <div
                key={day.toISOString()}
                className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-[#004949]/15 bg-white"
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "shrink-0 border-b border-[#004949]/10 px-3 py-3 text-left transition-colors",
                    isToday && "bg-[#004949]/5",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#004949]/55">
                    {CALENDAR_WEEKDAY_LONG[weekdayIndex]}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-lg font-bold",
                      isToday ? "text-[#004949]" : "text-[var(--atria-primary)]",
                    )}
                  >
                    {day.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </button>

                <CalendarDayDropZone
                  day={day}
                  className="calendar-day-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
                >
                  {dayEvents.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-[var(--atria-primary)]/35">
                      Sem compromissos
                    </p>
                  ) : (
                    dayEvents.map((evt, index) => (
                      <CalendarDraggableEvent
                        key={evt.id}
                        eventId={evt.id}
                        index={index}
                        canDrag={canDragEvent(evt)}
                      >
                        <CalendarEventStatusMenu
                          event={evt}
                          onOpenDetails={onOpenDetails}
                          compact={false}
                          className="w-full rounded-lg p-2"
                          detail={formatEventScheduleDetail(evt, "compact")}
                        />
                      </CalendarDraggableEvent>
                    ))
                  )}
                </CalendarDayDropZone>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
