"use client";

import { useCallback, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getEventTaskStatus,
  isBeforeToday,
  shiftEventScheduleToDay,
  withEventSchedule,
  type ShiftedEventSchedule,
} from "@/lib/calendar-utils";
import { toast } from "@/lib/toast";
import { calendarService, kanbanService } from "@/services";
import type { CalendarEvent, KanbanTask } from "@/services/types";

interface UseCalendarEventMoveOptions {
  tasks: KanbanTask[];
  onMoved: () => Promise<void>;
}

export function useCalendarEventMove({
  tasks,
  onMoved,
}: UseCalendarEventMoveOptions) {
  const { canEditKanbanTask, canEditCalendarEvent } = usePermissions();
  const [pendingMoves, setPendingMoves] = useState<
    ReadonlyMap<string, ShiftedEventSchedule>
  >(new Map());

  const canDragEvent = useCallback(
    (event: CalendarEvent) => {
      if (getEventTaskStatus(event) === "ok") return false;
      if (!event.kanbanTaskId) return canEditCalendarEvent(event);

      const linkedTask = tasks.find((task) => task.id === event.kanbanTaskId);
      return linkedTask ? canEditKanbanTask(linkedTask) : false;
    },
    [tasks, canEditKanbanTask, canEditCalendarEvent],
  );

  const moveEvent = useCallback(
    async (event: CalendarEvent, targetDay: Date) => {
      if (!canDragEvent(event)) return;
      if (isBeforeToday(targetDay)) {
        toast.error("Não é possível mover para um dia que já passou.");
        return;
      }

      const schedule = shiftEventScheduleToDay(event, targetDay);
      if (!schedule) return;

      setPendingMoves((current) => new Map(current).set(event.id, schedule));

      try {
        // Tarefas salvam pelo kanban, que já sincroniza o evento vinculado.
        if (event.kanbanTaskId) {
          await kanbanService.updateTask(event.kanbanTaskId, {
            publicationDate: schedule.publicationAt,
            deliveryDate: schedule.deliveryAt,
          });
        } else {
          await calendarService.updateEvent(event.id, {
            startAt: schedule.publicationAt,
            endAt: schedule.deliveryAt,
          });
        }
        await onMoved();
        toast.success("Data de publicação atualizada");
      } catch {
        toast.error("Não foi possível mover o card.");
      } finally {
        setPendingMoves((current) => {
          const next = new Map(current);
          next.delete(event.id);
          return next;
        });
      }
    },
    [canDragEvent, onMoved],
  );

  const applyPendingMoves = useCallback(
    (events: CalendarEvent[]) => {
      if (pendingMoves.size === 0) return events;
      return events.map((event) => {
        const schedule = pendingMoves.get(event.id);
        return schedule ? withEventSchedule(event, schedule) : event;
      });
    },
    [pendingMoves],
  );

  return { canDragEvent, moveEvent, applyPendingMoves };
}
