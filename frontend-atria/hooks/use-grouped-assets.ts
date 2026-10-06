import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { assetKeys } from "@/lib/query-keys";
import { assetsService } from "@/services";

export function useGroupedAssets() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: assetKeys.grouped(companyId ?? ""),
    queryFn: () => assetsService.getGroupedAssets(),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });
}
