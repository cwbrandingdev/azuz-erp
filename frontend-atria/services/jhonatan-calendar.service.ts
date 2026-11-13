import { apiRequest } from "./api";

export interface JhonatanAppointment {
  id: string;
  title: string;
  contactName: string;
  briefing: string | null;
  leadId: string | null;
  leadName: string | null;
  startAt: string;
  endAt: string;
  createdById: string;
  createdByName: string;
}

export interface CreateJhonatanAppointmentInput {
  startAt: string;
  title: string;
  leadId?: string;
  contactName?: string;
  briefing?: string;
}

export async function listJhonatanAppointments(
  from: string,
  to: string,
): Promise<JhonatanAppointment[]> {
  const params = new URLSearchParams({ from, to });
  return apiRequest<JhonatanAppointment[]>(`/jhonatan-calendar?${params}`);
}

export async function createJhonatanAppointment(
  data: CreateJhonatanAppointmentInput,
): Promise<JhonatanAppointment> {
  return apiRequest<JhonatanAppointment>("/jhonatan-calendar", {
    method: "POST",
    body: data,
  });
}

export async function deleteJhonatanAppointment(id: string): Promise<void> {
  return apiRequest<void>(`/jhonatan-calendar/${id}`, { method: "DELETE" });
}
