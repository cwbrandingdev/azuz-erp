"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskStatusBadge } from "@/components/kanban/task-status-select";
import {
  getInitials,
  getStatusCardStyle,
  isFinishedKanbanTask,
} from "@/lib/kanban-utils";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { ClientName } from "@/components/ui/client-name";
import type { KanbanColumn, KanbanTask } from "@/services/types";
import { getTaskContentTypeLabel } from "@/lib/task-content-type";

interface TaskCardProps {
  task: KanbanTask;
  column?: KanbanColumn | null;
  onClick: () => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  column,
  onClick,
}: TaskCardProps) {
  const statusStyle = getStatusCardStyle(task.status, task.productionPhase);
  const group = task.assignedGroup;
  const needsAdjustment = task.status === "jhonatan_reprova";
  const isOk = task.status === "ok";
  const finished = isFinishedKanbanTask(task, column);
  const [expanded, setExpanded] = useState(!finished);
  const wasFinished = useRef(finished);

  useEffect(() => {
    if (finished && !wasFinished.current) {
      setExpanded(false);
    }
    if (!finished) {
      setExpanded(true);
    }
    wasFinished.current = finished;
  }, [finished, task.columnId, task.status]);

  const collapsed = finished && !expanded;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "w-full cursor-pointer rounded-xl border text-left shadow-sm transition-all hover:shadow-md",
        collapsed ? "p-2.5" : "p-3",
        needsAdjustment && "ring-2 ring-amber-400/70",
        isOk && "ring-2 ring-emerald-400/60",
      )}
      style={statusStyle}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-2",
          !collapsed && "mb-2",
        )}
      >
        <h3 className="min-w-0 flex-1 text-sm font-medium text-[var(--atria-primary)]">
          {task.title}
        </h3>
        {finished ? (
          <button
            type="button"
            className="shrink-0 rounded-md p-0.5 text-[var(--atria-primary)]/50 hover:bg-white/60 hover:text-[var(--atria-primary)]"
            aria-label={collapsed ? "Expandir tarefa" : "Recolher tarefa"}
            aria-expanded={!collapsed}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {collapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </button>
        ) : (
          <TaskStatusBadge status={task.status} />
        )}
      </div>

      {!collapsed && (
        <>
          {(needsAdjustment || isOk || task.isBypassingInternalReview) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {needsAdjustment && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  <AlertTriangle className="size-3" />
                  Necessita de ajustes
                </span>
              )}
              {isOk && (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <PartyPopper className="size-3" />
                  Aprovado pelo cliente
                </span>
              )}
              {task.isBypassingInternalReview && needsAdjustment && (
                <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  Reenvio direto ao cliente
                </span>
              )}
            </div>
          )}

          {group ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--atria-primary)]"
                style={{
                  backgroundColor: `${group.color}33`,
                  border: `1px solid ${group.color}66`,
                }}
              >
                <Users className="size-3" />
                {group.name}
              </span>
            </div>
          ) : null}

          {task.client && (
            <ClientName className="mb-2 block text-[10px] text-[var(--atria-primary)]">
              {task.client.companyName}
            </ClientName>
          )}

          <p className="mb-2 text-[10px] font-medium text-[var(--atria-primary)]/55">
            {getTaskContentTypeLabel(task.contentType)}
          </p>

          {task.assignees.length > 0 && (
            <TooltipProvider>
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => {
                  const src = resolveMediaUrl(assignee.avatarUrl);
                  return (
                    <Tooltip key={assignee.id}>
                      <TooltipTrigger
                        render={
                          <Avatar className="size-7 border-2 border-white" />
                        }
                      >
                        {src && <AvatarImage src={src} alt={assignee.name} />}
                        <AvatarFallback className="bg-[var(--atria-accent)] text-[9px] font-semibold text-[var(--atria-primary)]">
                          {getInitials(assignee.name)}
                        </AvatarFallback>
                      </TooltipTrigger>
                      <TooltipContent>{assignee.name}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </>
      )}
    </div>
  );
}, (prev, next) => prev.task === next.task && prev.column === next.column);
