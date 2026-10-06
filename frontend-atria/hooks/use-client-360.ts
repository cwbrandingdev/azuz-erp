import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { clientKeys } from "@/lib/query-keys";
import { clientsService } from "@/services";
import type { Client360Data, Client360Section } from "@/services/types";

export function useClient360<T extends Client360Data = Client360Data>(
  clientId: string | undefined,
  section: Client360Section,
  enabled = true,
) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: clientKeys.detail360(companyId ?? "", clientId ?? "", section),
    queryFn: () => clientsService.getClient360<T>(clientId!, section),
    enabled: Boolean(companyId && clientId && enabled),
    staleTime: 30_000,
  });
}
