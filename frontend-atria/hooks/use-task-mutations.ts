import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { DEFAULT_TASK_STATUS, STATUS_COLORS, STATUS_LABELS } from "@/lib/kanban-utils";
import {
  resolveProductionPhaseForStatus,
  resolveTaskDisplayColor,
  resolveTaskDisplayLabel,
} from "@/lib/production-phase";
import {
  contentTypeRequiresScript,
  defaultProductionPhaseForContentType,
  isSocialContentType,
} from "@/lib/task-content-type";
import {
  applyTaskStatusInCache,
  buildOptimisticTask,
  getTasksCache,
  invalidateTasksCache,
  reorderTaskInCache,
  setTasksCache,
  upsertTaskInCache,
} from "@/lib/task-cache";
import { taskKeys } from "@/lib/query-keys";
import { kanbanService } from "@/services";
import type {
  CreateTaskInput,
  KanbanColumn,
  KanbanTask,
  KanbanTaskStatus,
} from "@/services/types";

export function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => invalidateTasksCache(queryClient);
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: (data: CreateTaskInput) =>
      kanbanService.createTask({
        ...data,
        status: data.status ?? DEFAULT_TASK_STATUS,
      }),
    onMutate: async (data) => {
      if (!companyId) return undefined;

      await queryClient.cancelQueries({ queryKey: taskKeys.root });

      const previous = getTasksCache(queryClient, companyId);
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticTask = buildOptimisticTask(
        {
          ...data,
          status: data.status ?? DEFAULT_TASK_STATUS,
        },
        previous,
        optimisticId,
      );

      upsertTaskInCache(queryClient, companyId, optimisticTask);

      return { previous, optimisticId };
    },
    onSuccess: (created, _data, context) => {
      if (!companyId) return;

      if (context?.optimisticId) {
        const current = getTasksCache(queryClient, companyId);
        if (current) {
          setTasksCache(
            queryClient,
            companyId,
            current.filter((task) => task.id !== context.optimisticId),
          );
        }
      }

      upsertTaskInCache(queryClient, companyId, created);
    },
    onError: (_error, _data, context) => {
      if (companyId && context?.previous) {
        setTasksCache(queryClient, companyId, context.previous);
      }
    },
    onSettled: () => {
      void invalidateTasksCache(queryClient);
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: Partial<CreateTaskInput>;
    }) => kanbanService.updateTask(taskId, data),
    onMutate: async ({ taskId, data }) => {
      if (!companyId) return undefined;

      await queryClient.cancelQueries({ queryKey: taskKeys.root });
      const previous = getTasksCache(queryClient, companyId);

      if (data.status) {
        applyTaskStatusInCache(
          queryClient,
          companyId,
          taskId,
          data.status,
          data.columnId,
        );
      } else if (previous) {
        const current = previous.find((task) => task.id === taskId);
        if (current) {
          const nextStatus = data.status ?? current.status;
          const nextContentType = data.contentType ?? current.contentType;
          let requestedPhase = data.productionPhase;
          if (
            nextStatus === "falta_gravar" &&
            data.contentType &&
            data.productionPhase === undefined &&
            (contentTypeRequiresScript(data.contentType) !==
              contentTypeRequiresScript(current.contentType) ||
              isSocialContentType(data.contentType) !==
                isSocialContentType(current.contentType))
          ) {
            requestedPhase =
              defaultProductionPhaseForContentType(data.contentType) ??
              undefined;
          }
          const resolvedPhase = resolveProductionPhaseForStatus(
            nextStatus,
            current.productionPhase,
            requestedPhase,
            nextContentType,
          );

          upsertTaskInCache(queryClient, companyId, {
            ...current,
            ...data,
            description: data.description ?? current.description,
            postCaption:
              data.postCaption === undefined
                ? current.postCaption
                : data.postCaption,
            referenceUrl:
              data.referenceUrl === undefined
                ? current.referenceUrl
                : data.referenceUrl,
            dueDate: data.dueDate ?? current.dueDate,
            clientId: data.clientId ?? current.clientId,
            status: nextStatus,
            productionPhase: resolvedPhase,
            statusColor: resolveTaskDisplayColor(
              nextStatus,
              resolvedPhase,
              STATUS_COLORS,
            ),
            statusLabel: resolveTaskDisplayLabel(
              nextStatus,
              resolvedPhase,
              STATUS_LABELS,
            ),
          });
        }
      }

      return { previous };
    },
    onSuccess: (updated) => {
      if (companyId) {
        upsertTaskInCache(queryClient, companyId, updated);
      }
    },
    onError: (_error, _data, context) => {
      if (companyId && context?.previous) {
        setTasksCache(queryClient, companyId, context.previous);
      }
    },
    onSettled: () => {
      void invalidateTasksCache(queryClient);
    },
  });
}

export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: KanbanTaskStatus;
      columnId?: string;
    }) => kanbanService.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status, columnId }) => {
      if (!companyId) return undefined;

      await queryClient.cancelQueries({ queryKey: taskKeys.root });

      const previous = getTasksCache(queryClient, companyId);
      applyTaskStatusInCache(queryClient, companyId, taskId, status, columnId);

      return { previous };
    },
    onSuccess: (updated) => {
      if (companyId) {
        upsertTaskInCache(queryClient, companyId, updated);
      }
    },
    onError: (_error, _data, context) => {
      if (companyId && context?.previous) {
        setTasksCache(queryClient, companyId, context.previous);
      }
    },
    onSettled: () => {
      void invalidateTasksCache(queryClient);
    },
  });
}

export function useMoveTaskMutation() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: ({ taskId, columnId, order }: MoveTaskMutationInput) =>
      kanbanService.moveTask(taskId, columnId, order),
    onMutate: async ({
      taskId,
      columnId,
      order,
      status,
    }: MoveTaskMutationInput) => {
      if (!companyId) return undefined;

      await queryClient.cancelQueries({ queryKey: taskKeys.root });

      const previous = getTasksCache(queryClient, companyId);
      reorderTaskInCache(queryClient, companyId, taskId, columnId, order, status);

      return { previous };
    },
    onSuccess: (updated) => {
      if (companyId) {
        upsertTaskInCache(queryClient, companyId, updated);
      }
    },
    onError: (_error, _data, context) => {
      if (companyId && context?.previous) {
        setTasksCache(queryClient, companyId, context.previous);
      }
    },
    onSettled: () => {
      void invalidateTasksCache(queryClient);
    },
  });
}

export type MoveTaskMutationInput = {
  taskId: string;
  columnId: string;
  order: number;
  status: KanbanTaskStatus;
  columns?: KanbanColumn[];
};

export type { KanbanTask };
