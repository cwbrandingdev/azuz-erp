"use client";

import type { ReactNode } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

interface CalendarDraggableEventProps {
  eventId: string;
  index: number;
  canDrag: boolean;
  children: ReactNode;
}

export function CalendarDraggableEvent({
  eventId,
  index,
  canDrag,
  children,
}: CalendarDraggableEventProps) {
  return (
    <Draggable
      draggableId={eventId}
      index={index}
      isDragDisabled={!canDrag}
      // O card é um <button>; sem isso a lib bloqueia o arraste em elementos interativos.
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={cn(
            "flex min-w-0 flex-col",
            canDrag && "cursor-grab",
            snapshot.isDragging && "cursor-grabbing opacity-95 shadow-lg",
          )}
        >
          {children}
        </div>
      )}
    </Draggable>
  );
}
