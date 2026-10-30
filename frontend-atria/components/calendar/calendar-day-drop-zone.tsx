"use client";

import type { ReactNode } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

const DAY_DROPPABLE_PREFIX = "calendar-day:";

export function toDayDroppableId(day: Date) {
  return `${DAY_DROPPABLE_PREFIX}${day.getTime()}`;
}

export function parseDayDroppableId(droppableId: string): Date | null {
  if (!droppableId.startsWith(DAY_DROPPABLE_PREFIX)) return null;
  const timestamp = Number(droppableId.slice(DAY_DROPPABLE_PREFIX.length));
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

interface CalendarDayDropZoneProps {
  day: Date;
  className?: string;
  children: ReactNode;
}

export function CalendarDayDropZone({
  day,
  className,
  children,
}: CalendarDayDropZoneProps) {
  return (
    <Droppable droppableId={toDayDroppableId(day)}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            className,
            "rounded-lg transition-colors",
            snapshot.isDraggingOver && "bg-[var(--atria-accent)]/15",
          )}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
