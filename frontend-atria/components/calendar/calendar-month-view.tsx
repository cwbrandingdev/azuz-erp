"use client";

import type { CalendarEvent } from "@/services/types";
import {
  CALENDAR_MONTH_LABELS,
  CALENDAR_WEEKDAY_SHORT,
  isSameDay,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { CalendarDayDropZone } from "./calendar-day-drop-zone";
import { CalendarDraggableEvent } from "./calendar-draggable-event";
import { CalendarEventChip } from "./calendar-event-chip";

interface CalendarMonthViewProps {
  currentDate: Date;
  selectedDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  loading: boolean;
  onSelectDate: (date: Date) => void;
  onOpenDetails: (event: CalendarEvent) => void;
  canDragEvent: (event: CalendarEvent) => boolean;
}

export function CalendarMonthView({
  currentDate,
  selectedDate,
  eventsByDay,
  loading,
  onSelectDate,
  onOpenDetails,
  canDragEvent,
}: CalendarMonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: (Date | null)[] = [];

  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 grid shrink-0 grid-cols-7 gap-1">
        {CALENDAR_WEEKDAY_SHORT.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-[var(--atria-primary)]/50 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-24" />;
            }

            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex min-h-24 flex-col rounded-xl border p-2 text-left transition-colors",
                  isSelected
                    ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 ring-2 ring-[var(--atria-primary)]/10"
                    : "border-[var(--atria-primary)]/10 hover:border-[var(--atria-primary)]/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors",
                    isToday
                      ? "bg-[var(--atria-primary)] text-white"
                      : "text-[var(--atria-primary)] hover:bg-[var(--atria-primary)]/5",
                  )}
                >
                  {day.getDate()}
                </button>

                <CalendarDayDropZone
                  day={day}
                  className={cn(
                    "calendar-day-scroll mt-1 flex min-h-0 max-h-[7.5rem] flex-1 flex-col gap-0.5 overflow-y-auto",
                    dayEvents.length > 3 && "pr-0.5",
                  )}
                >
                  {dayEvents.map((evt, index) => (
                    <CalendarDraggableEvent
                      key={evt.id}
                      eventId={evt.id}
                      index={index}
                      canDrag={canDragEvent(evt)}
                    >
                      <CalendarEventChip
                        event={evt}
                        onOpenDetails={onOpenDetails}
                      />
                    </CalendarDraggableEvent>
                  ))}
                </CalendarDayDropZone>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 shrink-0 text-center text-xs text-[var(--atria-primary)]/40">
        {CALENDAR_MONTH_LABELS[month]} {year}
      </p>
    </div>
  );
}
