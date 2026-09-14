"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/contexts/confirm-context";
import { calendarService, clientsService, kanbanService } from "@/services";
import { toast } from "@/lib/toast";
import { useCompanyId } from "@/hooks/use-company-id";
import { usePermissions } from "@/hooks/use-permissions";
import { useMoveTaskMutation, useUpdateTaskStatusMutation } from "@/hooks/use-task-mutations";
import { useTasks } from "@/hooks/use-tasks";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Permission } from "@/lib/permissions";
import { DEFAULT_TASK_STATUS } from "@/lib/kanban-utils";
import { matchesRecordingFilter } from "@/lib/production-phase";
import { taskKeys } from "@/lib/query-keys";
import type { Client, KanbanColumn, KanbanTask, TeamMember } from "@/services/types";
import { ColumnHeader } from "./column-header";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeletionHistoryDrawer } from "./deletion-history-drawer";
import {
  EMPTY_KANBAN_FILTERS,
  KanbanFilters,
  matchesTaskDateFilter,
} from "./kanban-filters";
import { TaskCard } from "./task-card";
import { KanbanHorizontalScroll } from "./kanban-horizontal-scroll";
import { useTaskDetail } from "./task-detail-provider";

export function KanbanBoard() {
  const { openTask, openTaskById } = useTaskDetail();
  const searchParams = useSearchParams();
  const taskIdFromQuery = searchParams.get("taskId");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const companyId = useCompanyId();
  const { canEditKanbanTask } = usePermissions();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const moveTaskMutation = useMoveTaskMutation();
  const updateTaskStatusMutation = useUpdateTaskStatusMutation();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filters, setFilters] = useState(EMPTY_KANBAN_FILTERS);
  const [metaLoading, setMetaLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadBoardMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [cols, team, clientList] = await Promise.all([
        kanbanService.getColumns(),
        calendarService.getTeamMembers().catch(() => [] as TeamMember[]),
        clientsService
          .getClients()
          .catch(() => [] as Client[]),
      ]);
      setColumns(cols.sort((a, b) => a.order - b.order));
      setMembers(team);
      setClients(clientList);
    } catch {
      setColumns([]);
      setMembers([]);
      setClients([]);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoardMeta();
  }, [loadBoardMeta]);

  useEffect(() => {
    if (!taskIdFromQuery) return;
    void openTaskById(taskIdFromQuery).catch(() => {
      toast.error("Não foi possível abrir a tarefa.");
    });
  }, [taskIdFromQuery, openTaskById]);

  const loading = metaLoading || tasksLoading;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        filters.assigneeId &&
        !task.assignees.some((assignee) => assignee.id === filters.assigneeId)
      ) {
        return false;
      }
      if (filters.clientId && task.clientId !== filters.clientId) return false;
      if (!matchesRecordingFilter(task, filters.recordingFilter)) return false;
      if (!matchesTaskDateFilter(task, filters)) return false;
      return true;
    });
  }, [tasks, filters]);

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
    return Array.from(byId.values());
  }, [clients, tasks]);

  function getColumnTasks(columnId: string) {
    return filteredTasks
      .filter((task) => task.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newColumnId = destination.droppableId;
    const newOrder = destination.index;
    const targetColumn = columns.find((column) => column.id === newColumnId);
    const movingTask = tasks.find((task) => task.id === draggableId);
    if (movingTask && !canEditKanbanTask(movingTask)) {
      toast.error("Você só pode mover tarefas atribuídas a você.");
      return;
    }
    const newStatus =
      targetColumn?.statusKey ?? movingTask?.status ?? DEFAULT_TASK_STATUS;

    try {
      if (movingTask && newStatus !== movingTask.status) {
        await updateTaskStatusMutation.mutateAsync({
          taskId: draggableId,
          status: newStatus,
          columnId: newColumnId,
        });
      }

      await moveTaskMutation.mutateAsync({
        taskId: draggableId,
        columnId: newColumnId,
        order: newOrder,
        status: newStatus,
      });
      toast.success("Tarefa atualizada");
    } catch {
      toast.error("Não foi possível mover a tarefa");
    }
  }

  function handleTaskCreated(task: KanbanTask) {
    openTask(task, columns);
  }

  async function handleClearBoard() {
    const confirmed = await confirm({
      title: "Apagar Kanban",
      description:
        "Remover todas as tarefas deste quadro? Essa ação registra o histórico de exclusões e pode ser consultada depois.",
      confirmLabel: "Apagar Kanban",
      destructive: true,
    });
    if (!confirmed) return;

    setClearing(true);
    try {
      const result = await kanbanService.clearTasksBoard();
      if (companyId) {
        await queryClient.invalidateQueries({
          queryKey: taskKeys.all(companyId),
        });
      }
      toast.success(
        result.deletedCount === 0
          ? "O quadro já estava vazio."
          : `${result.deletedCount} tarefa(s) removida(s) do kanban.`,
      );
    } catch {
      /* toast handled by api */
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Kanban
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Gerencie tarefas e fluxo de produção
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeletionHistoryDrawer entityFilter="KANBAN_TASK" />
          <PermissionGate anyOf={[Permission.KANBAN_ALL_EDIT]}>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={clearing || tasks.length === 0}
              onClick={() => void handleClearBoard()}
            >
              <Trash2 className="size-4" />
              {clearing ? "Apagando..." : "Apagar Kanban"}
            </Button>
          </PermissionGate>
          <CreateTaskDialog
            onSuccess={handleTaskCreated}
          />
        </div>
      </div>

      <KanbanFilters
        filters={filters}
        onChange={setFilters}
        members={members}
        clients={filterClients}
        showDateFilters
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        {columns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
            <p className="text-sm text-[var(--atria-primary)]/50">
              Carregando colunas do quadro...
            </p>
          </div>
        ) : (
          <KanbanHorizontalScroll>
            {columns.map((column) => {
              const columnTasks = getColumnTasks(column.id);

              return (
                <div key={column.id} className="flex w-72 shrink-0 flex-col">
                  <ColumnHeader
                    column={column}
                    taskCount={columnTasks.length}
                    onUpdate={() => void loadBoardMeta()}
                  />

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex min-h-[420px] flex-1 flex-col gap-3 rounded-b-2xl border border-t-0 p-3 transition-colors ${
                          snapshot.isDraggingOver
                            ? "border-[var(--atria-accent)] bg-[var(--atria-accent)]/10"
                            : "border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02]"
                        }`}
                        style={{
                          borderLeftColor: `${column.color}55`,
                          borderLeftWidth: 2,
                        }}
                      >
                        {columnTasks.length === 0 && (
                          <p className="py-8 text-center text-xs text-[var(--atria-primary)]/40">
                            Arraste tarefas para cá
                          </p>
                        )}

                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                            isDragDisabled={!canEditKanbanTask(task)}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={
                                  dragSnapshot.isDragging
                                    ? "opacity-95 shadow-lg"
                                    : ""
                                }
                                style={dragProvided.draggableProps.style}
                              >
                                <div className="flex items-start gap-1">
                                  {canEditKanbanTask(task) ? (
                                    <button
                                      type="button"
                                      aria-label="Arrastar tarefa"
                                      className="mt-3 shrink-0 cursor-grab rounded p-1 text-[var(--atria-primary)]/40 hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)] active:cursor-grabbing"
                                      {...dragProvided.dragHandleProps}
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <GripVertical className="size-4" />
                                    </button>
                                  ) : (
                                    <span className="mt-3 size-6 shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <TaskCard
                                      task={task}
                                      column={column}
                                      onClick={() => openTask(task, columns)}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </KanbanHorizontalScroll>
        )}
      </DragDropContext>
    </div>
  );
}
