import { apiRequest } from "./api";
import type {
  AddLeadToKanbanInput,
  CreateLeadStageInput,
  CrmReminderBoard,
  CrmReminderTask,
  CrmReminderTaskStatus,
  FetchMapsLeadsInput,
  Lead,
  LeadComment,
  LeadKanbanBoard,
  LeadStage,
  LeadStatus,
  UpdateCrmLeadInput,
  UpdateLeadStageInput,
  UpdateLeadStatusInput,
} from "./types";

export interface LeadSearchInput {
  bairro: string;
  categoria: string;
  cidade: string;
  termoBusca?: string;
}

export type LeadSearchResult =
  | Lead[]
  | {
      source?: string;
      results?: Lead[];
    }
  | unknown;

export async function searchLeads(
  data: LeadSearchInput,
): Promise<LeadSearchResult> {
  return apiRequest<LeadSearchResult>("/leads/search", {
    method: "POST",
    body: {
      bairro: data.bairro,
      categoria: data.categoria,
      cidade: data.cidade,
      countryCode: "BR",
    },
  });
}

export async function fetchMapsLeads(
  data: FetchMapsLeadsInput,
): Promise<Lead[]> {
  return apiRequest<Lead[]>("/leads/fetch-maps", {
    method: "POST",
    body: {
      city: data.city,
      category: data.category,
      neighborhood: data.neighborhood,
    },
  });
}

export async function listLeads(): Promise<Lead[]> {
  return apiRequest<Lead[]>("/leads");
}

export async function listProspectingLeads(
  organizationId?: string,
): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (organizationId) {
    params.set("organizationId", organizationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<Lead[]>(`/crm/leads/prospecting-leads${query}`);
}

export async function getKanbanBoard(
  organizationId?: string,
): Promise<LeadKanbanBoard> {
  const params = new URLSearchParams();
  if (organizationId) {
    params.set("organizationId", organizationId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<LeadKanbanBoard>(`/crm/leads/kanban${query}`);
}

export async function addToKanban(
  data: AddLeadToKanbanInput,
  options?: { skipToast?: boolean },
): Promise<Lead> {
  return apiRequest<Lead>("/leads/kanban", {
    method: "POST",
    body: data,
    skipToast: options?.skipToast,
  });
}

export async function removeFromKanban(
  id: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/leads/${id}/kanban`, {
    method: "DELETE",
  });
}

export async function updateLead(
  id: string,
  data: UpdateCrmLeadInput,
): Promise<Lead> {
  return apiRequest<Lead>(`/crm/leads/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function updateLeadStatus(
  id: string,
  data: UpdateLeadStatusInput,
): Promise<Lead> {
  return apiRequest<Lead>(`/leads/${id}/status`, {
    method: "PATCH",
    body: data,
  });
}

export async function qualifyLead(id: string): Promise<Lead> {
  return apiRequest<Lead>(`/leads/${encodeURIComponent(id)}/qualify`, {
    method: "POST",
  });
}

export async function preQualifyLead(id: string): Promise<Lead> {
  return apiRequest<Lead>(`/leads/${encodeURIComponent(id)}/pre-qualify`, {
    method: "POST",
    timeoutMs: 320_000,
  });
}

export async function getLeadComments(leadId: string): Promise<LeadComment[]> {
  return apiRequest<LeadComment[]>(`/leads/${leadId}/comments`);
}

export async function createLeadComment(
  leadId: string,
  content: string,
): Promise<LeadComment> {
  return apiRequest<LeadComment>(`/leads/${leadId}/comments`, {
    method: "POST",
    body: { content },
  });
}

export async function toggleLeadCollapse(
  id: string,
  isMinimized?: boolean,
): Promise<Lead> {
  return apiRequest<Lead>(`/crm/leads/${id}/collapse`, {
    method: "PATCH",
    body: isMinimized === undefined ? {} : { isMinimized },
  });
}

function stagesQuery(organizationId?: string) {
  if (!organizationId) return "";
  const params = new URLSearchParams();
  params.set("organizationId", organizationId);
  return `?${params.toString()}`;
}

export async function listLeadStages(
  organizationId?: string,
): Promise<LeadStage[]> {
  return apiRequest<LeadStage[]>(`/crm/stages${stagesQuery(organizationId)}`);
}

export async function createLeadStage(
  data: CreateLeadStageInput,
): Promise<LeadStage> {
  return apiRequest<LeadStage>("/crm/stages", {
    method: "POST",
    body: data,
  });
}

export async function updateLeadStage(
  id: string,
  data: UpdateLeadStageInput,
): Promise<LeadStage> {
  return apiRequest<LeadStage>(`/crm/stages/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function reorderLeadStages(
  ids: string[],
  organizationId?: string,
): Promise<LeadStage[]> {
  return apiRequest<LeadStage[]>("/crm/stages/reorder", {
    method: "PATCH",
    body: { ids, ...(organizationId ? { organizationId } : {}) },
  });
}

export async function deleteLeadStage(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/crm/stages/${id}`, {
    method: "DELETE",
  });
}

export async function getReminderBoard(): Promise<CrmReminderBoard> {
  return apiRequest<CrmReminderBoard>("/crm/reminders");
}

export async function updateReminderStatus(
  id: string,
  status: CrmReminderTaskStatus,
): Promise<CrmReminderTask> {
  return apiRequest<CrmReminderTask>(`/crm/reminders/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export function normalizeLeadSearchResult(result: LeadSearchResult): Lead[] {
  if (Array.isArray(result)) return result;
  if (
    result &&
    typeof result === "object" &&
    "results" in result &&
    Array.isArray((result as { results?: unknown }).results)
  ) {
    return (result as { results: Lead[] }).results;
  }
  return [];
}

export type { LeadStatus };
