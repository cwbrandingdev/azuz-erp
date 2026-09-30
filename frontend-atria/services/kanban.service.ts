import { apiRequest, uploadFile, API_BASE_URL } from "./api";
import type {
  ClearBoardResult,
  CreateColumnInput,
  CreateTaskInput,
  DeletionHistoryPage,
  KanbanColumn,
  KanbanTask,
  KanbanTaskStatus,
  TaskComment,
  TaskHistoryEntry,
  UpdateColumnInput,
} from "./types";

export async function getColumns(): Promise<KanbanColumn[]> {
  return apiRequest<KanbanColumn[]>("/kanban/columns");
}

export async function createColumn(
  data: CreateColumnInput,
): Promise<KanbanColumn> {
  return apiRequest<KanbanColumn>("/kanban/columns", {
    method: "POST",
    body: data,
  });
}

export async function updateColumn(
  id: string,
  data: UpdateColumnInput,
): Promise<KanbanColumn> {
  return apiRequest<KanbanColumn>(`/kanban/columns/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteColumn(id: string): Promise<void> {
  return apiRequest<void>(`/kanban/columns/${id}`, { method: "DELETE" });
}

export async function reorderColumns(
  items: { id: string; order: number }[],
): Promise<KanbanColumn[]> {
  return apiRequest<KanbanColumn[]>("/kanban/columns/reorder", {
    method: "PATCH",
    body: { items },
  });
}

export async function getTasks(params?: {
  columnId?: string;
  clientId?: string;
}): Promise<KanbanTask[]> {
  const search = new URLSearchParams();
  if (params?.columnId) search.set("columnId", params.columnId);
  if (params?.clientId) search.set("clientId", params.clientId);
  const query = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<KanbanTask[]>(`/tasks${query}`);
}

export async function getTask(id: string): Promise<KanbanTask> {
  return apiRequest<KanbanTask>(`/tasks/${id}`);
}

export async function createTask(data: CreateTaskInput): Promise<KanbanTask> {
  return apiRequest<KanbanTask>("/tasks", {
    method: "POST",
    body: {
      ...data,
      priority: data.priority?.toUpperCase(),
      status: data.status?.toUpperCase(),
      productionPhase: data.productionPhase?.toUpperCase(),
      contentType: data.contentType?.toUpperCase(),
    },
  });
}

export async function updateTask(
  id: string,
  data: Partial<CreateTaskInput>,
): Promise<KanbanTask> {
  const body: Record<string, unknown> = { ...data };
  if (data.priority) body.priority = data.priority.toUpperCase();
  if (data.status) body.status = data.status.toUpperCase();
  if (data.productionPhase) {
    body.productionPhase = data.productionPhase.toUpperCase();
  }
  if (data.contentType) {
    body.contentType = data.contentType.toUpperCase();
  }

  return apiRequest<KanbanTask>(`/kanban/tasks/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function updateTaskStatus(
  id: string,
  status: KanbanTaskStatus,
): Promise<KanbanTask> {
  return apiRequest<KanbanTask>(`/tasks/${id}/status`, {
    method: "PATCH",
    body: { status: status.toUpperCase() },
  });
}

export async function publishInstagramNow(id: string): Promise<KanbanTask> {
  return apiRequest<KanbanTask>(`/kanban/tasks/${id}/publish-instagram`, {
    method: "POST",
  });
}

export async function moveTask(
  id: string,
  columnId: string,
  order: number,
): Promise<KanbanTask> {
  return apiRequest<KanbanTask>(`/kanban/tasks/${id}/move`, {
    method: "PATCH",
    body: { columnId, order },
  });
}

export async function deleteTask(id: string): Promise<void> {
  return apiRequest<void>(`/kanban/tasks/${id}`, { method: "DELETE" });
}

export async function clearTasksBoard(): Promise<ClearBoardResult> {
  return apiRequest<ClearBoardResult>("/kanban/tasks/clear", {
    method: "DELETE",
  });
}

export async function getDeletionHistory(params?: {
  page?: number;
  limit?: number;
}): Promise<DeletionHistoryPage> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<DeletionHistoryPage>(`/kanban/deletion-history${query}`);
}

export async function getComments(taskId: string): Promise<TaskComment[]> {
  return apiRequest<TaskComment[]>(`/kanban/tasks/${taskId}/comments`);
}

export async function createComment(
  taskId: string,
  content: string,
): Promise<TaskComment> {
  return apiRequest<TaskComment>(`/kanban/tasks/${taskId}/comments`, {
    method: "POST",
    body: { content },
  });
}

export async function getHistory(
  taskId: string,
): Promise<TaskHistoryEntry[]> {
  return apiRequest<TaskHistoryEntry[]>(`/kanban/tasks/${taskId}/history`);
}

export async function updateInternalReview(
  taskId: string,
  status: "pending" | "approved" | "rejected",
  note?: string,
) {
  return apiRequest<KanbanTask>(`/kanban/tasks/${taskId}/internal-review`, {
    method: "PATCH",
    body: { status, note },
  });
}

export async function uploadTaskAsset(
  taskId: string,
  file: File,
  caption?: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  if (caption?.trim()) {
    formData.append("caption", caption.trim());
  }
  return uploadFile<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number | null;
    caption?: string | null;
    uploadedAt: string;
    uploadedBy: { id: string; name: string; avatarUrl: string | null };
  }>(`/kanban/tasks/${taskId}/assets`, formData);
}

export async function deleteTaskAsset(taskId: string, assetId: string) {
  return apiRequest<void>(`/kanban/tasks/${taskId}/assets/${assetId}`, {
    method: "DELETE",
  });
}

export async function bulkDeleteTaskAssets(taskId: string, assetIds: string[]) {
  return apiRequest<{ deletedCount: number }>(
    `/kanban/tasks/${taskId}/assets/bulk-delete`,
    {
      method: "POST",
      body: { assetIds },
    },
  );
}

export function resolveTaskAssetUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
