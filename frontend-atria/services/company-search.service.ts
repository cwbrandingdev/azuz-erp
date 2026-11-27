import { getAccessToken, isRememberedSession, setAccessToken, setStoredUser } from "@/lib/auth-storage";
import { resolveApiBaseUrl } from "@/lib/api-url";
import { ApiError, refreshAuthSession } from "@/services/api";
import type { Lead } from "@/services/types";

const API_BASE_URL = resolveApiBaseUrl();
import { CNAE_SEARCH_TIMEOUT_MS } from "@/lib/lead-search-limits";

const COMPANY_SEARCH_TIMEOUT_MS = CNAE_SEARCH_TIMEOUT_MS;
const MAPS_ENRICH_TIMEOUT_MS = 210_000;

export type LeadSearchQueryType = "NICHO" | "CNAE" | "MAPS";

export interface B2bLeadSearchInput {
  queryType: LeadSearchQueryType;
  queryValue: string;
  city: string;
  uf: string;
  address?: string;
  maxResults?: number;
  page?: number;
  pageSize?: number;
  name?: string;
  openedFrom?: string;
  openedTo?: string;
}

export interface LeadSearchSessionPageQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  openedFrom?: string;
  openedTo?: string;
  city?: string;
  uf?: string;
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
  address?: string | null;
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
  totalCount: number;
  page?: number;
  pageSize?: number;
}

export interface OpenedAtCompaniesResponse {
  leads: Lead[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const CATALOG_PAGE_SIZE = 25;

async function companySearchRequest<T>(
  endpoint: string,
  init: RequestInit,
  timeoutMs = COMPANY_SEARCH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      page: input.page ?? 1,
      pageSize: input.pageSize ?? CATALOG_PAGE_SIZE,
      ...(input.maxResults !== undefined
        ? { maxResults: input.maxResults }
        : {}),
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.openedFrom?.trim()
        ? { openedFrom: input.openedFrom.trim() }
        : {}),
      ...(input.openedTo?.trim() ? { openedTo: input.openedTo.trim() } : {}),
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

export async function searchCompaniesByOpenedAt(
  query: LeadSearchSessionPageQuery = {},
): Promise<OpenedAtCompaniesResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? CATALOG_PAGE_SIZE));
  if (query.name?.trim()) params.set("name", query.name.trim());
  if (query.openedFrom?.trim()) params.set("openedFrom", query.openedFrom.trim());
  if (query.openedTo?.trim()) params.set("openedTo", query.openedTo.trim());
  if (query.city?.trim()) params.set("city", query.city.trim());
  if (query.uf?.trim()) params.set("uf", query.uf.trim().toUpperCase());

  return companySearchRequest<OpenedAtCompaniesResponse>(
    `/leads/by-opening-date?${params.toString()}`,
    { method: "GET" },
  );
}

export async function getLeadSearchSessionLeads(
  sessionId: string,
  query: LeadSearchSessionPageQuery = {},
): Promise<B2bLeadSearchResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? CATALOG_PAGE_SIZE));
  if (query.name?.trim()) params.set("name", query.name.trim());
  if (query.openedFrom?.trim()) params.set("openedFrom", query.openedFrom.trim());
  if (query.openedTo?.trim()) params.set("openedTo", query.openedTo.trim());

  return companySearchRequest<B2bLeadSearchResponse>(
    `/leads/sessions/${encodeURIComponent(sessionId)}?${params.toString()}`,
    { method: "GET" },
  );
}

export interface MapsSessionEnrichResponse extends B2bLeadSearchResponse {
  matched: number;
  updated: number;
}

export async function enrichLeadSearchSessionMaps(
  sessionId: string,
): Promise<MapsSessionEnrichResponse> {
  return companySearchRequest<MapsSessionEnrichResponse>(
    `/leads/sessions/${encodeURIComponent(sessionId)}/enrich-maps`,
    { method: "POST" },
    MAPS_ENRICH_TIMEOUT_MS,
  );
}
