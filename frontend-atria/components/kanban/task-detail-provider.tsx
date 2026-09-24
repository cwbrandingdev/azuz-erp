"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TaskDetailDialog } from "@/components/kanban/task-detail-dialog";
import { invalidateTasksCache } from "@/lib/task-cache";
import { kanbanService } from "@/services";
import type { KanbanColumn, KanbanTask } from "@/services/types";

interface TaskDetailContextValue {
  openTaskById: (taskId: string) => Promise<void>;
  openTask: (task: KanbanTask, columns?: KanbanColumn[]) => void;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function TaskDetailProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadColumns = useCallback(async () => {
    try {
      const cols = await kanbanService.getColumns();
      setColumns(cols.sort((a, b) => a.order - b.order));
    } catch {
      setColumns([]);
    }
  }, []);

  const openTask = useCallback(
    (task: KanbanTask, cols?: KanbanColumn[]) => {
      if (cols?.length) setColumns(cols);
      else void loadColumns();
      setSelectedTask(task);
      setOpen(true);
    },
    [loadColumns],
  );

  const openTaskById = useCallback(
    async (taskId: string) => {
      await loadColumns();
      const task = await kanbanService.getTask(taskId);
      setSelectedTask(task);
      setOpen(true);
    },
    [loadColumns],
  );

  const handleUpdate = useCallback(() => {
    setRefreshKey((k) => k + 1);
    void invalidateTasksCache(queryClient);
    if (selectedTask && open) {
      void kanbanService.getTask(selectedTask.id).then(setSelectedTask).catch(() => {
        setSelectedTask(null);
        setOpen(false);
      });
    }
  }, [selectedTask, queryClient, open]);

  const value = useMemo(
    () => ({ openTaskById, openTask }),
    [openTaskById, openTask],
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
