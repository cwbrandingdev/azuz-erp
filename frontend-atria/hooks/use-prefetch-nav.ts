import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCompanyId } from "@/hooks/use-company-id";
import { prefetchNavRoute } from "@/lib/prefetch-nav";

export function usePrefetchNav() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useCallback(
    (href: string) => {
      if (!companyId) return;
      prefetchNavRoute(queryClient, companyId, href);
    },
    [companyId, queryClient],
  );
}
