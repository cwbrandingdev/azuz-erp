"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { appSessionService } from "@/services";

export const APP_SESSION_POLL_MS = 120_000;

export const appSessionKey = (userId: string) =>
  ["app-session", userId] as const;

export function useAppSession() {
  const { isAuthenticated, user } = useAuth();
  const query = useQuery({
    queryKey: appSessionKey(user?.id ?? ""),
    queryFn: () => appSessionService.getAppSession(),
    enabled: isAuthenticated && Boolean(user?.id),
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
        ? APP_SESSION_POLL_MS
        : false,
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void query.refetch();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isAuthenticated, query.refetch]);

  return query;
}
