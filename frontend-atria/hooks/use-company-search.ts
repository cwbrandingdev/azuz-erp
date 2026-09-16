import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLeadSearchSessionLeads,
  listLeadSearchSessions,
  searchCnaeClasses,
  searchCompanies,
  type B2bLeadSearchInput,
  type B2bLeadSearchResponse,
} from "@/services/company-search.service";

const SESSIONS_KEY = ["lead-search-sessions"] as const;

export function useLeadSearchSessions() {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: listLeadSearchSessions,
    staleTime: 30_000,
  });
}

export function useLeadSearchSessionLeads(sessionId: string | null) {
  return useQuery({
    queryKey: ["lead-search-session", sessionId],
    queryFn: () => getLeadSearchSessionLeads(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
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
        ["lead-search-session", data.session.id],
        data,
      );
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}
