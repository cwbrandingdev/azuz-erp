import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { contractKeys } from "@/lib/query-keys";
import { contractsService } from "@/services";

export function useContracts() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: contractKeys.list(companyId ?? ""),
    queryFn: () => contractsService.getContracts(),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });
}
