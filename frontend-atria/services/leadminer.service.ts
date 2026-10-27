import { apiRequest } from "./api";
import type { Lead } from "./types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

export interface LeadMinerSearchInput {
  category: string;
  city: string;
  neighborhood?: string;
  max_results: number;
}

export interface LeadMinerJobStartResponse {
  job_id: string;
  status: string;
}

export interface LeadMinerLead {
  title?: string;
  phone: string;
  address?: string;
  website?: string | null;
  instagram?: string | null;
  rating?: number;
  reviews?: number;
  category?: string;
}

export interface LeadMinerJobStatusResponse {
  status: "pending" | "processing" | "completed" | "failed";
  data?: LeadMinerLead[];
  error?: string;
}

export interface ImportLeadMinerLeadsInput {
  city: string;
  neighborhood: string;
  category: string;
  leads: LeadMinerLead[];
  addToKanban?: boolean;
  organizationId?: string;
}

export async function startLeadMinerSearch(
  data: LeadMinerSearchInput,
): Promise<LeadMinerJobStartResponse> {
  return apiRequest<LeadMinerJobStartResponse>("/leadminer/search", {
    method: "POST",
    body: data,
  });
}

export async function getLeadMinerJob(
  jobId: string,
): Promise<LeadMinerJobStatusResponse> {
  return apiRequest<LeadMinerJobStatusResponse>(
    `/leadminer/job/${encodeURIComponent(jobId)}`,
    { skipToast: true },
  );
}

export async function importLeadMinerLeads(
  data: ImportLeadMinerLeadsInput,
): Promise<Lead[]> {
  return apiRequest<Lead[]>("/leadminer/import", {
    method: "POST",
    body: data,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollLeadMinerJob(
  jobId: string,
  onStatus?: (status: LeadMinerJobStatusResponse["status"]) => void,
): Promise<LeadMinerJobStatusResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const job = await getLeadMinerJob(jobId);
    onStatus?.(job.status);

    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Tempo limite ao aguardar a busca de leads.");
}
