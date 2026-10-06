import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { dashboardKeys } from "@/lib/query-keys";
import { dashboardService } from "@/services";

export function useDashboardOverview() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: dashboardKeys.overview(companyId ?? ""),
    queryFn: () => dashboardService.getDashboardOverview(),
    enabled: Boolean(companyId),
    staleTime: 45_000,
  });
}
