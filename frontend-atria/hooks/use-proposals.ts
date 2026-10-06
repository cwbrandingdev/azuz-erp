import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { proposalKeys } from "@/lib/query-keys";
import { proposalsService } from "@/services";

export function useProposals() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: proposalKeys.list(companyId ?? ""),
    queryFn: () => proposalsService.getProposals(),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });
}
