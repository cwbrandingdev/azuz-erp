"use client";

import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { productivityKeys } from "@/lib/query-keys";
import {
  productivityService,
  type ProductivityQuery,
} from "@/services";

export function useProductivityReport(
  query: ProductivityQuery,
  enabled = true,
) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: productivityKeys.report(companyId ?? "", query),
    queryFn: () => productivityService.getProductivityReport(query),
    enabled: Boolean(companyId) && enabled,
    staleTime: 30_000,
  });
}
