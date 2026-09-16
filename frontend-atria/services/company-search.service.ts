import { getAccessToken, isRememberedSession, setAccessToken, setStoredUser } from "@/lib/auth-storage";
import { resolveApiBaseUrl } from "@/lib/api-url";
import { ApiError, refreshAuthSession } from "@/services/api";
import type { Lead } from "@/services/types";

const API_BASE_URL = resolveApiBaseUrl();
const COMPANY_SEARCH_TIMEOUT_MS = 120_000;

export type LeadSearchQueryType = "NICHO" | "CNAE";

export interface B2bLeadSearchInput {
  queryType: LeadSearchQueryType;
  queryValue: string;
  city: string;
  uf: string;
  address?: string;
  maxResults?: number;
}

export interface CnaeClassOption {
  id: string;
  description: string;
}

export interface LeadSearchSessionSummary {
  id: string;
  tenantId: string;
  queryType: LeadSearchQueryType;
  queryValue: string;
  city: string;
  uf: string;
  createdAt: string;
  leadsCount: number;
}

export interface LeadSearchSessionDetail {
  id: string;
  tenantId: string;
  queryType: LeadSearchQueryType;
  queryValue: string;
  city: string;
  uf: string;
  createdAt: string;
  leadsCount: number;
}

export interface B2bLeadSearchResponse {
  session: LeadSearchSessionDetail;
  leads: Lead[];
}

async function companySearchRequest<T>(
  endpoint: string,
  init: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    COMPANY_SEARCH_TIMEOUT_MS,
  );

  const makeRequest = async (token: string | null) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  };

  try {
    let token = getAccessToken();
    let response = await makeRequest(token);

    if (response.status === 401) {
      const session = await refreshAuthSession();
      if (session?.accessToken) {
        token = session.accessToken;
        const remember = isRememberedSession();
        setAccessToken(session.accessToken, remember);
        setStoredUser(session.user, remember);
        response = await makeRequest(token);
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (data as { message?: string | string[] })?.message ?? "Request failed";
      throw new ApiError(
        Array.isArray(message) ? message.join(", ") : message,
        response.status,
        data,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("A busca excedeu o tempo limite", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchCompanies(
  input: B2bLeadSearchInput,
): Promise<B2bLeadSearchResponse> {
  return companySearchRequest<B2bLeadSearchResponse>("/leads/search", {
    method: "POST",
    body: JSON.stringify({
      queryType: input.queryType,
      queryValue: input.queryValue.trim(),
      city: input.city.trim(),
      uf: input.uf.trim().toUpperCase(),
      address: input.address?.trim() || undefined,
      maxResults: input.maxResults,
    }),
  });
}

export async function searchCnaeClasses(
  query: string,
): Promise<CnaeClassOption[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return companySearchRequest<CnaeClassOption[]>(`/leads/cnae/search${suffix}`, {
    method: "GET",
  });
}

export async function listLeadSearchSessions(): Promise<
  LeadSearchSessionSummary[]
> {
  return companySearchRequest<LeadSearchSessionSummary[]>("/leads/sessions", {
    method: "GET",
  });
}

export async function getLeadSearchSessionLeads(
  sessionId: string,
): Promise<B2bLeadSearchResponse> {
  return companySearchRequest<B2bLeadSearchResponse>(
    `/leads/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
  );
}
