import { apiRequest, API_BASE_URL } from "./api";
import type {
  CreateProposalInput,
  Proposal,
  ProposalStatus,
  UpdateProposalInput,
} from "./types";

export async function getProposals(params?: {
  clientId?: string;
  status?: ProposalStatus;
}): Promise<Proposal[]> {
  const entries = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [
      k,
      k === "status" ? String(v).toUpperCase() : String(v),
    ]);

  const query = new URLSearchParams(entries).toString();
  return apiRequest<Proposal[]>(`/proposals${query ? `?${query}` : ""}`);
}

export async function getProposal(id: string): Promise<Proposal> {
  return apiRequest<Proposal>(`/proposals/${id}`);
}

export async function getPublicProposal(slug: string): Promise<Proposal> {
  return apiRequest<Proposal>(`/public/proposals/${slug}`, {
    skipAuth: true,
    skipToast: true,
  });
}

export async function createProposal(
  data: CreateProposalInput,
): Promise<Proposal> {
  return apiRequest<Proposal>("/proposals", {
    method: "POST",
    body: {
      ...data,
      status: data.status?.toUpperCase(),
    },
  });
}

export async function updateProposal(
  id: string,
  data: UpdateProposalInput,
): Promise<Proposal> {
  const body: Record<string, unknown> = { ...data };
  if (data.status) body.status = data.status.toUpperCase();

  return apiRequest<Proposal>(`/proposals/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function publishProposal(id: string): Promise<Proposal> {
  return apiRequest<Proposal>(`/proposals/${id}/publish`, {
    method: "PATCH",
    body: {},
  });
}

export async function deleteProposal(id: string): Promise<void> {
  return apiRequest<void>(`/proposals/${id}`, { method: "DELETE" });
}

export function buildPublicProposalUrl(slug: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/p/${slug}`;
  }
  return `${API_BASE_URL.replace(/:\d+$/, ":3000")}/p/${slug}`;
}
