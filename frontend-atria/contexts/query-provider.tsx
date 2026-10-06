"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  createAppQueryClient,
  hydrateQueryClientFromSession,
  registerAppQueryClient,
  subscribeQueryPersistence,
} from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient();
    registerAppQueryClient(client);
    return client;
  });

  useEffect(() => {
    hydrateQueryClientFromSession(queryClient);
    return subscribeQueryPersistence(queryClient);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
