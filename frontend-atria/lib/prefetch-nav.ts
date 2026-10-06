import type { QueryClient } from "@tanstack/react-query";
import { getCurrentScope } from "@/lib/financial-utils";
import {
  clientKeys,
  companySettingsKeys,
  dashboardKeys,
  financeKeys,
  taskKeys,
} from "@/lib/query-keys";
import {
  clientRequestsService,
  clientsService,
  companySettingsService,
  dashboardService,
  financeService,
  kanbanService,
} from "@/services";
import type { ClientRequest } from "@/services/types";

export function prefetchNavRoute(
  queryClient: QueryClient,
  companyId: string,
  href: string,
) {
  if (href === "/dashboard" || href.startsWith("/dashboard?")) {
    void queryClient.prefetchQuery({
      queryKey: dashboardKeys.overview(companyId),
      queryFn: () => dashboardService.getDashboardOverview(),
      staleTime: 45_000,
    });
    void queryClient.prefetchQuery({
      queryKey: dashboardKeys.pendingRequests(companyId),
      queryFn: async () => {
        try {
          return await clientRequestsService.getClientRequests({
            status: "pending",
          });
        } catch {
          return [] as ClientRequest[];
        }
      },
      staleTime: 30_000,
    });
    return;
  }

  if (href === "/clients" || href.startsWith("/clients?")) {
    void queryClient.prefetchQuery({
      queryKey: clientKeys.list(companyId, ""),
      queryFn: () => clientsService.getClients(),
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: companySettingsKeys.all(companyId),
      queryFn: () =>
        companySettingsService.getCompanySettings().catch(() => null),
      staleTime: 5 * 60_000,
    });
    return;
  }

  if (href === "/financial" || href.startsWith("/financial?")) {
    const scope = getCurrentScope();
    const from = `${scope.year}-01-01`;
    const to = `${scope.year}-12-31`;
    void queryClient.prefetchQuery({
      queryKey: financeKeys.overview(
        companyId,
        scope.year,
        scope.month,
      ),
      queryFn: () =>
        financeService.getFinanceOverview({
          year: scope.year,
          ...(scope.month ? { month: scope.month } : {}),
        }),
      staleTime: 20_000,
    });
    void queryClient.prefetchQuery({
      queryKey: financeKeys.management(
        companyId,
        from,
        to,
        scope.year,
      ),
      queryFn: () =>
        financeService.getManagementDashboard({
          from,
          to,
          chartYear: scope.year,
        }),
      staleTime: 20_000,
    });
    return;
  }

  if (href === "/kanban" || href.startsWith("/kanban?")) {
    void queryClient.prefetchQuery({
      queryKey: taskKeys.all(companyId),
      queryFn: () => kanbanService.getTasks(),
      staleTime: 10_000,
    });
  }
}
