import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { dashboardKeys } from "@/lib/query-keys";
import { clientRequestsService } from "@/services";
import type { ClientRequest } from "@/services/types";

export function usePendingClientRequests() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: dashboardKeys.pendingRequests(companyId ?? ""),
    queryFn: async () => {
      try {
        return await clientRequestsService.getClientRequests({
          status: "pending",
        });
      } catch {
        return [] as ClientRequest[];
      }
    },
    enabled: Boolean(companyId),
    staleTime: 30_000,
  });
}
