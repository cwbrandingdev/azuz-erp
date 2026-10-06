import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  invalidateAssetQueries,
  invalidateClientQueries,
  invalidateContractQueries,
  invalidateFinanceQueries,
  invalidateProposalQueries,
} from "@/lib/query-invalidation";

export function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return useCallback(
    () => invalidateFinanceQueries(queryClient),
    [queryClient],
  );
}

export function useInvalidateClients() {
  const queryClient = useQueryClient();
  return useCallback(
    () => invalidateClientQueries(queryClient),
    [queryClient],
  );
}

export function useInvalidateProposals() {
  const queryClient = useQueryClient();
  return useCallback(
    () => invalidateProposalQueries(queryClient),
    [queryClient],
  );
}

export function useInvalidateContracts() {
  const queryClient = useQueryClient();
  return useCallback(
    () => invalidateContractQueries(queryClient),
    [queryClient],
  );
}

export function useInvalidateAssets() {
  const queryClient = useQueryClient();
  return useCallback(
    () => invalidateAssetQueries(queryClient),
    [queryClient],
  );
}
