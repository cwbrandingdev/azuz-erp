"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/contexts/confirm-context";
import { calendarService, clientsService, kanbanService } from "@/services";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/hooks/use-permissions";
import { useMoveTaskMutation, useUpdateTaskStatusMutation } from "@/hooks/use-task-mutations";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Permission } from "@/lib/permissions";
import { DEFAULT_TASK_STATUS } from "@/lib/kanban-utils";
import { moveColumn } from "@/lib/kanban-columns";
import { invalidateTasksCache } from "@/lib/task-cache";
import type {
  Client,
  KanbanBoardColumn,
  KanbanBoardFilters,
  KanbanTask,
  TeamMember,
} from "@/services/types";
import { ColumnHeader } from "./column-header";
import { DragHandleStrip } from "./drag-handle-strip";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeletionHistoryDrawer } from "./deletion-history-drawer";
import { EMPTY_KANBAN_FILTERS, KanbanFilters } from "./kanban-filters";
import { KanbanLoadMore } from "./kanban-load-more";
import { TaskCard } from "./task-card";
import { KanbanHorizontalScroll } from "./kanban-horizontal-scroll";
import { useTaskDetail } from "./task-detail-provider";

export function KanbanBoard() {
  const { openTask, openTaskById, subscribeTaskUpdates } = useTaskDetail();
  const searchParams = useSearchParams();
  const taskIdFromQuery = searchParams.get("taskId");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { canEditKanbanTask, canEditAllKanban } = usePermissions();
  const canReorderColumns = canEditAllKanban();
  const moveTaskMutation = useMoveTaskMutation();
  const updateTaskStatusMutation = useUpdateTaskStatusMutation();
  const [columns, setColumns] = useState<KanbanBoardColumn[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filters, setFilters] = useState(EMPTY_KANBAN_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [boardLoading, setBoardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const [clearing, setClearing] = useState(false);
  const boardRequest = useRef(0);
  const hasLoadedRef = useRef(false);
  const columnsRef = useRef(columns);
  const loadingMoreRef = useRef(loadingMore);
  const refreshingRef = useRef(refreshing);
  columnsRef.current = columns;
  loadingMoreRef.current = loadingMore;
  refreshingRef.current = refreshing;

  const loadBoardMeta = useCallback(async () => {
    try {
      const [team, clientList] = await Promise.all([
        calendarService.getTeamMembers().catch(() => [] as TeamMember[]),
        clientsService.getClients().catch(() => [] as Client[]),
      ]);
      setMembers(team);
      setClients(clientList);
    } catch {
      setMembers([]);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    void loadBoardMeta();
  }, [loadBoardMeta]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(filters.search.trim()),
      400,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (!taskIdFromQuery) return;
    void openTaskById(taskIdFromQuery).catch(() => {
      toast.error("Não foi possível abrir a tarefa.");
    });
  }, [taskIdFromQuery, openTaskById]);

  const boardFilters = useMemo<KanbanBoardFilters>(
    () => ({
      search: debouncedSearch || undefined,
      assigneeId: filters.assigneeId || undefined,
      clientId: filters.clientId || undefined,
      recordingFilter: filters.recordingFilter || undefined,
      dateField: filters.dateField || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    }),
    [
      debouncedSearch,
      filters.assigneeId,
      filters.clientId,
      filters.dateField,
      filters.endDate,
      filters.recordingFilter,
      filters.startDate,
    ],
  );

  const loadBoard = useCallback(
    async (options?: { silent?: boolean; limit?: number }) => {
      const requestId = ++boardRequest.current;
      const silent = Boolean(options?.silent);
      if (!silent) {
        if (hasLoadedRef.current) setRefreshing(true);
        else setBoardLoading(true);
      }

      try {
        const board = await kanbanService.getBoard({
          ...boardFilters,
          ...(options?.limit && options.limit > 20
            ? { limit: options.limit }
            : {}),
        });
        if (requestId !== boardRequest.current) return;
        setColumns(board.columns);
        hasLoadedRef.current = true;
      } catch {
        if (requestId !== boardRequest.current) return;
        if (!silent && !hasLoadedRef.current) setColumns([]);
      } finally {
        if (requestId === boardRequest.current) {
          setBoardLoading(false);
          setRefreshing(false);
        }
      }
    },
    [boardFilters],
  );

  const refreshLoaded = useCallback(() => {
    if (
      refreshingRef.current ||
      Object.values(loadingMoreRef.current).some(Boolean)
    ) {
      return;
    }
    const loaded = columnsRef.current.reduce(
      (max, column) => Math.max(max, column.tasks.length),
      20,
    );
    return loadBoard({ silent: true, limit: Math.min(loaded, 200) });
  }, [loadBoard]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    return subscribeTaskUpdates(() => {
      void refreshLoaded();
    });
  }, [refreshLoaded, subscribeTaskUpdates]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void refreshLoaded();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [refreshLoaded]);

  const searchPending = filters.search.trim() !== debouncedSearch;
  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.assigneeId ||
      filters.clientId ||
      filters.recordingFilter ||
      filters.startDate ||
      filters.endDate,
  );
  const totalTasks = columns.reduce((sum, column) => sum + column.total, 0);

  const filterClients = useMemo(() => {
    if (clients.length > 0) return clients;
    const byId = new Map<string, Client>();
    for (const task of columns.flatMap((column) => column.tasks)) {
      if (task.client) {
        byId.set(task.client.id, {
          id: task.client.id,
          companyName: task.client.companyName,
          avatarUrl: task.client.avatarUrl,
        } as Client);
      }
    }
    return Array.from(byId.values());
  }, [clients, columns]);

  async function loadMoreColumn(column: KanbanBoardColumn) {
    if (!column.hasMore || loadingMore[column.id]) return;

    const request = boardRequest.current;
    setLoadingMore((current) => ({ ...current, [column.id]: true }));
    try {
      const page = await kanbanService.getColumnTasks(
        column.id,
        column.tasks.length,
        boardFilters,
      );
      if (request !== boardRequest.current) return;
      setColumns((current) =>
        current.map((item) => {
          if (item.id !== column.id) return item;
          const known = new Set(item.tasks.map((task) => task.id));
          const fresh = page.tasks.filter((task) => !known.has(task.id));
          return {
            ...item,
            tasks: [...item.tasks, ...fresh],
            total: page.total,
            hasMore: fresh.length > 0 && page.hasMore,
          };
        }),
      );
    } catch {
      toast.error("Não foi possível carregar mais tarefas.");
    } finally {
      setLoadingMore((current) => ({ ...current, [column.id]: false }));
    }
  }

  function applyOptimisticMove(
    taskId: string,
    toColumnId: string,
    toIndex: number,
  ) {
    setColumns((current) => {
      const moving = current
        .flatMap((column) => column.tasks)
        .find((task) => task.id === taskId);
      if (!moving) return current;

      const target = current.find((column) => column.id === toColumnId);
      return current.map((column) => {
        const isSource = column.tasks.some((task) => task.id === taskId);
        const isTarget = column.id === toColumnId;
        if (!isSource && !isTarget) return column;

        const nextTasks = column.tasks.filter((task) => task.id !== taskId);
        if (isTarget) {
          nextTasks.splice(toIndex, 0, {
            ...moving,
            columnId: toColumnId,
            order: toIndex,
            status: target?.statusKey ?? moving.status,
          });
        }

        const delta =
          isTarget && !isSource ? 1 : isSource && !isTarget ? -1 : 0;
        return {
          ...column,
          tasks: nextTasks,
          total: Math.max(0, column.total + delta),
        };
      });
    });
  }

  async function handleColumnDragEnd(fromIndex: number, toIndex: number) {
    const previous = columns;
    const reordered = moveColumn(columns, fromIndex, toIndex) as KanbanBoardColumn[];
    setColumns(reordered);

    try {
      await kanbanService.reorderColumns(
        reordered.map(({ id, order }) => ({ id, order })),
      );
    } catch {
      setColumns(previous);
      toast.error("Não foi possível reordenar as colunas.");
    }
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

    if (result.type === "COLUMN") {
      await handleColumnDragEnd(source.index, destination.index);
      return;
    }

    const newColumnId = destination.droppableId;
    const newOrder = destination.index;
    const targetColumn = columns.find((column) => column.id === newColumnId);
    const movingTask = columns
      .flatMap((column) => column.tasks)
      .find((task) => task.id === draggableId);
    if (movingTask && !canEditKanbanTask(movingTask)) {
      toast.error("Você só pode mover tarefas atribuídas a você.");
      return;
    }
    const newStatus =
      targetColumn?.statusKey ?? movingTask?.status ?? DEFAULT_TASK_STATUS;

    applyOptimisticMove(draggableId, newColumnId, newOrder);

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
      await loadBoard();
      toast.error("Não foi possível mover a tarefa");
    }
  }

  function handleTaskCreated(task: KanbanTask) {
    void loadBoard();
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
      await invalidateTasksCache(queryClient);
      await loadBoard();
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

  if (boardLoading) {
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
              disabled={clearing || totalTasks === 0}
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
        searching={
          searchPending || (refreshing && filters.search.trim().length > 0)
        }
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        {columns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
            <p className="text-sm text-[var(--atria-primary)]/50">
              Nenhuma coluna no quadro.
            </p>
          </div>
        ) : (
          <div className="relative">
            {refreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/55">
                <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
              </div>
            )}
            <KanbanHorizontalScroll>
            <Droppable
              droppableId="kanban-board"
              type="COLUMN"
              direction="horizontal"
            >
              {(boardProvided) => (
                <div
                  ref={boardProvided.innerRef}
                  {...boardProvided.droppableProps}
                  className="flex"
                >
                  {columns.map((column, columnIndex) => {
                    const columnTasks = column.tasks;

                    return (
                      <Draggable
                        key={column.id}
                        draggableId={column.id}
                        index={columnIndex}
                        isDragDisabled={!canReorderColumns}
                      >
                        {(columnProvided, columnSnapshot) => (
                          <div
                            ref={columnProvided.innerRef}
                            {...columnProvided.draggableProps}
                            className={`mr-4 flex w-72 shrink-0 flex-col ${
                              columnSnapshot.isDragging ? "opacity-95 shadow-lg" : ""
                            }`}
                          >
                            <ColumnHeader
                              column={column}
                              taskCount={column.total}
                              onUpdate={() => void loadBoard()}
                              dragHandleProps={
                                canReorderColumns
                                  ? columnProvided.dragHandleProps
                                  : null
                              }
                            />

                            <Droppable droppableId={column.id} type="TASK">
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
                                      {hasActiveFilters
                                        ? "Nenhuma tarefa corresponde aos filtros"
                                        : "Arraste tarefas para cá"}
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
                                          <div className="flex items-stretch gap-1">
                                            {canEditKanbanTask(task) ? (
                                              <DragHandleStrip
                                                label="Arrastar tarefa"
                                                {...dragProvided.dragHandleProps}
                                                onClick={(event) =>
                                                  event.stopPropagation()
                                                }
                                              />
                                            ) : (
                                              <span className="w-6 shrink-0" />
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
                                  {column.hasMore && (
                                    <KanbanLoadMore
                                      loading={Boolean(loadingMore[column.id])}
                                      onLoadMore={() => void loadMoreColumn(column)}
                                    />
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {boardProvided.placeholder}
                </div>
              )}
            </Droppable>
            </KanbanHorizontalScroll>
          </div>
        )}
      </DragDropContext>
    </div>
  );
}
