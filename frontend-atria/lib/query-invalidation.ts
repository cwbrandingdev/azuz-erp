import type { QueryClient } from "@tanstack/react-query";
import {
  assetKeys,
  clientKeys,
  contractKeys,
  dashboardKeys,
  financeKeys,
  proposalKeys,
} from "@/lib/query-keys";

export function invalidateFinanceQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: financeKeys.root }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.root }),
  ]);
}

export function invalidateClientQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: clientKeys.root }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.root }),
    queryClient.invalidateQueries({ queryKey: assetKeys.root }),
  ]);
}

export function invalidateProposalQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: proposalKeys.root });
}

export function invalidateContractQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: contractKeys.root });
}

export function invalidateAssetQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: assetKeys.root });
}
