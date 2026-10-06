import {
  QueryClient,
  dehydrate,
  hydrate,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { financeKeys } from "@/lib/query-keys";

export const QUERY_CACHE_STORAGE_KEY = "atria-query-cache";

const defaultOptions: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
};

let appQueryClient: QueryClient | null = null;

export function createAppQueryClient() {
  return new QueryClient(defaultOptions);
}

export function getAppQueryClient() {
  return appQueryClient;
}

export function registerAppQueryClient(client: QueryClient) {
  appQueryClient = client;
}

export function hydrateQueryClientFromSession(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const raw = sessionStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (!raw) return;
    hydrate(queryClient, JSON.parse(raw));
    void queryClient.invalidateQueries({ queryKey: financeKeys.root });
  } catch {
    try {
      sessionStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
    } catch {
      // ignore quota / private mode
    }
  }
}

export function subscribeQueryPersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return () => undefined;

  let timer: number | undefined;
  const persist = () => {
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => query.state.status === "success",
      });
      sessionStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / private mode
    }
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(persist, 400);
  });

  return () => {
    window.clearTimeout(timer);
    unsubscribe();
  };
}

export function clearAppQueryCache() {
  appQueryClient?.clear();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}
