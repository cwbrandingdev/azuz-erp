import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { financeKeys } from "@/lib/query-keys";
import { financeService } from "@/services";

export function useFinanceOverview(year: number, month: number | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: financeKeys.overview(companyId ?? "", year, month),
    queryFn: () =>
      financeService.getFinanceOverview({
        year,
        ...(month ? { month } : {}),
      }),
    enabled: Boolean(companyId),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useManagementDashboard(params: {
  from: string;
  to: string;
  chartYear: number;
}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: financeKeys.management(
      companyId ?? "",
      params.from,
      params.to,
      params.chartYear,
    ),
    queryFn: () => financeService.getManagementDashboard(params),
    enabled: Boolean(companyId),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useChartOfAccounts(options?: { enabled?: boolean }) {
  const companyId = useCompanyId();
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: financeKeys.chartOfAccounts(companyId ?? ""),
    queryFn: () => financeService.getChartOfAccounts(),
    enabled: Boolean(companyId) && enabled,
    staleTime: 5 * 60_000,
  });
}
