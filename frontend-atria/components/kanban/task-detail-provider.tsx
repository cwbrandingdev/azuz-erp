"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { invalidateTasksCache } from "@/lib/task-cache";
import { kanbanService } from "@/services";
import type { Client, KanbanColumn, KanbanTask, TeamMember } from "@/services/types";

export type TaskDetailOpenMeta = {
  members?: TeamMember[];
  clients?: Client[];
};

interface TaskDetailContextValue {
  openTaskById: (taskId: string) => Promise<void>;
  openTask: (
    task: KanbanTask,
    columns?: KanbanColumn[],
    meta?: TaskDetailOpenMeta,
  ) => void;
  subscribeTaskUpdates: (listener: () => void) => () => void;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function TaskDetailProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seedMembers, setSeedMembers] = useState<TeamMember[] | undefined>();
  const [seedClients, setSeedClients] = useState<Client[] | undefined>();
  const listenersRef = useRef(new Set<() => void>());

  const subscribeTaskUpdates = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const notifyTaskUpdates = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const loadColumns = useCallback(async () => {
    try {
      const cols = await kanbanService.getColumns();
      setColumns(cols.sort((a, b) => a.order - b.order));
    } catch {
      setColumns([]);
    }
  }, []);

  const openTask = useCallback(
    (task: KanbanTask, cols?: KanbanColumn[], meta?: TaskDetailOpenMeta) => {
      if (cols?.length) setColumns(cols);
      else void loadColumns();
      setSeedMembers(meta?.members);
      setSeedClients(meta?.clients);
      setSelectedTask(task);
      setOpen(true);
    },
    [loadColumns],
  );

  const openTaskById = useCallback(
    async (taskId: string) => {
      await loadColumns();
      const task = await kanbanService.getTask(taskId);
      setSeedMembers(undefined);
      setSeedClients(undefined);
      setSelectedTask(task);
      setOpen(true);
    },
    [loadColumns],
  );

  const handleUpdate = useCallback(() => {
    setRefreshKey((k) => k + 1);
    notifyTaskUpdates();
    void invalidateTasksCache(queryClient);
    if (selectedTask && open) {
      void kanbanService.getTask(selectedTask.id).then(setSelectedTask).catch(() => {
        setSelectedTask(null);
        setOpen(false);
      });
    }
  }, [selectedTask, queryClient, open, notifyTaskUpdates]);

  const value = useMemo(
    () => ({ openTaskById, openTask, subscribeTaskUpdates }),
    [openTaskById, openTask, subscribeTaskUpdates],
  );

  return (
    <TaskDetailContext.Provider value={value}>
      {children}
      <TaskDetailDialog
        key={refreshKey}
        task={selectedTask}
        columns={columns}
        open={open}
        onOpenChange={setOpen}
        onUpdate={handleUpdate}
        initialMembers={seedMembers}
        initialClients={seedClients}
      />
    </TaskDetailContext.Provider>
  );
}

export function useTaskDetail() {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error("useTaskDetail must be used within TaskDetailProvider");
  }
  return context;
}
