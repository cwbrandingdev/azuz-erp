import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leadsService } from "@/services";
import {
  enrichLeadSearchSessionMaps,
  getLeadSearchSessionLeads,
  listLeadSearchSessions,
  searchCnaeClasses,
  searchCompanies,
  searchCompaniesByOpenedAt,
  type B2bLeadSearchInput,
  type B2bLeadSearchResponse,
  type LeadSearchSessionPageQuery,
} from "@/services/company-search.service";

const SESSIONS_KEY = ["lead-search-sessions"] as const;
export const PROSPECTING_LEADS_KEY = ["prospecting-leads"] as const;

const LEAD_SEARCH_QUERY_OPTIONS = {
  staleTime: 30 * 60_000,
  gcTime: 24 * 60 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function useLeadSearchSessions() {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: listLeadSearchSessions,
    ...LEAD_SEARCH_QUERY_OPTIONS,
  });
}

export function useLeadSearchSessionLeads(
  sessionId: string | null,
  query: LeadSearchSessionPageQuery = {},
  enabled = true,
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const name = query.name?.trim() ?? "";
  const openedFrom = query.openedFrom?.trim() ?? "";
  const openedTo = query.openedTo?.trim() ?? "";

  return useQuery({
    queryKey: [
      "lead-search-session",
      sessionId,
      page,
      pageSize,
      name,
      openedFrom,
      openedTo,
    ],
    queryFn: () =>
      getLeadSearchSessionLeads(sessionId!, {
        page,
        pageSize,
        name: name || undefined,
        openedFrom: openedFrom || undefined,
        openedTo: openedTo || undefined,
      }),
    enabled: Boolean(sessionId) && enabled,
    ...LEAD_SEARCH_QUERY_OPTIONS,
  });
}

export function useCompaniesByOpenedAt(
  query: LeadSearchSessionPageQuery = {},
  enabled = true,
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const name = query.name?.trim() ?? "";
  const openedFrom = query.openedFrom?.trim() ?? "";
  const openedTo = query.openedTo?.trim() ?? "";
  const city = query.city?.trim() ?? "";
  const uf = query.uf?.trim().toUpperCase() ?? "";
  const active = enabled && Boolean(openedFrom || openedTo);

  return useQuery({
    queryKey: [
      "companies-by-opened-at",
      page,
      pageSize,
      name,
      openedFrom,
      openedTo,
      city,
      uf,
    ],
    queryFn: () =>
      searchCompaniesByOpenedAt({
        page,
        pageSize,
        name: name || undefined,
        openedFrom: openedFrom || undefined,
        openedTo: openedTo || undefined,
        ...(city ? { city } : {}),
        ...(uf ? { uf } : {}),
      }),
    enabled: active,
    ...LEAD_SEARCH_QUERY_OPTIONS,
  });
}

export function useProspectingLeads(enabled = true) {
  return useQuery({
    queryKey: PROSPECTING_LEADS_KEY,
    queryFn: () => leadsService.listProspectingLeads(),
    enabled,
    ...LEAD_SEARCH_QUERY_OPTIONS,
  });
}

export function useCnaeSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["cnae-search", query],
    queryFn: () => searchCnaeClasses(query),
    enabled,
    staleTime: 60_000,
  });
}

export function useCompanySearchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: B2bLeadSearchInput) => searchCompanies(input),
    onSuccess: (data: B2bLeadSearchResponse) => {
      queryClient.setQueryData(
        [
          "lead-search-session",
          data.session.id,
          data.page ?? 1,
          data.pageSize ?? 25,
          "",
          "",
          "",
        ],
        data,
      );
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

export function useEnrichSessionMapsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => enrichLeadSearchSessionMaps(sessionId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        [
          "lead-search-session",
          data.session.id,
          data.page ?? 1,
          data.pageSize ?? 25,
          "",
          "",
          "",
        ],
        data,
      );
    },
  });
}
