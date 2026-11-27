import { apiRequest } from "./api";

export interface StudioPendingRequestCard {
  id: string;
  title: string;
  clientId: string;
  clientName: string | null;
  createdAt: string;
  status: string;
}

export interface StudioTaskDueTodayCard {
  id: string;
  title: string;
  clientName: string | null;
  dueDate: string | null;
  column: string;
}

export interface StudioHomePayload {
  pendingRequests: StudioPendingRequestCard[];
  tasksDueToday: StudioTaskDueTodayCard[];
}

export function getStudioHome() {
  return apiRequest<StudioHomePayload>("/studio/home", { skipToast: true });
}