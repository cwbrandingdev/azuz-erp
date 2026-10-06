import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { clientKeys, companySettingsKeys } from "@/lib/query-keys";
import { clientsService, companySettingsService } from "@/services";

export function useClients(groupFilter = "") {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: clientKeys.list(companyId ?? "", groupFilter),
    queryFn: () => clientsService.getClients(groupFilter || undefined),
    enabled: Boolean(companyId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCompanySettings() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: companySettingsKeys.all(companyId ?? ""),
    queryFn: () =>
      companySettingsService.getCompanySettings().catch(() => null),
    enabled: Boolean(companyId),
    staleTime: 5 * 60_000,
  });
}
