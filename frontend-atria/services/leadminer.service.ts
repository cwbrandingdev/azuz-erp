import { apiRequest } from "./api";
import type { Lead } from "./types";

const LEADMINER_API_URL = (process.env.NEXT_PUBLIC_LEADMINER_API ?? "").replace(
  /\/$/,
  "",
);

const REQUEST_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

export interface LeadMinerSearchInput {
  category: string;
  city: string;
  neighborhood: string;
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

async function leadMinerRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${LEADMINER_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (response.status === 404) {
      throw new Error("Job ID not found");
    }

    const data = (await response.json().catch(() => null)) as
      | T
      | { message?: string; error?: string }
      | null;

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && "message" in data
          ? data.message
          : null) ??
        (data && typeof data === "object" && "error" in data
          ? data.error
          : null) ??
        `Lead Miner request failed (${response.status})`;
      throw new Error(
        typeof message === "string" ? message : "Lead Miner request failed",
      );
    }

    if (data == null) {
      throw new Error("Lead Miner returned an empty response");
    }

    return data as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function startLeadMinerSearch(
  data: LeadMinerSearchInput,
): Promise<LeadMinerJobStartResponse> {
  return leadMinerRequest<LeadMinerJobStartResponse>("/leads/search", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getLeadMinerJob(
  jobId: string,
): Promise<LeadMinerJobStatusResponse> {
  return leadMinerRequest<LeadMinerJobStatusResponse>(
    `/leads/job/${encodeURIComponent(jobId)}`,
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
