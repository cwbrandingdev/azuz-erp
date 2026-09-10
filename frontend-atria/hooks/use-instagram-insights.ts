"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import {
  getInstagramClientMetrics,
  listInstagramConversations,
  listInstagramInsightClients,
} from "@/services/instagram-insights.service";
import type { InstagramContentType } from "@/services/types";
import {
  getCurrentPeriod,
  type FinancePeriod,
} from "@/lib/financial-utils";

export function isMetaTokenExpiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  const data = error.data as
    | { code?: string; message?: string | string[] }
    | undefined;
  if (data?.code === "META_TOKEN_EXPIRED") {
    return true;
  }
  return error.message.toLowerCase().includes("token de acesso meta expirado");
}

function parsePeriod(
  monthValue: string | null,
  yearValue: string | null,
): FinancePeriod {
  const current = getCurrentPeriod();
  const month = Number(monthValue);
  const year = Number(yearValue);
  const resolvedMonth =
    Number.isInteger(month) && month >= 1 && month <= 12 ? month : current.month;
  const resolvedYear =
    Number.isInteger(year) && year >= 2020 && year <= 2100
      ? year
      : current.year;

  if (
    resolvedYear > current.year ||
    (resolvedYear === current.year && resolvedMonth > current.month)
  ) {
    return current;
  }

  return { month: resolvedMonth, year: resolvedYear };
}

export function useInstagramInsightClients() {
  return useQuery({
    queryKey: ["instagram-insight-clients"],
    queryFn: listInstagramInsightClients,
    staleTime: 60_000,
  });
}

export function useInstagramClientMetrics(
  clientId: string | null,
  contentType: InstagramContentType | undefined,
  period: FinancePeriod,
) {
  return useQuery({
    queryKey: [
      "instagram-client-metrics",
      clientId,
      contentType ?? "all",
      period.month,
      period.year,
    ],
    queryFn: () =>
      getInstagramClientMetrics(clientId!, {
        contentType,
        month: period.month,
        year: period.year,
      }),
    enabled: Boolean(clientId),
    retry: (failureCount, error) => {
      if (isMetaTokenExpiredError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useInstagramConversations(period: FinancePeriod) {
  return useQuery({
    queryKey: ["instagram-conversations", period.month, period.year],
    queryFn: () =>
      listInstagramConversations({
        month: period.month,
        year: period.year,
      }),
    retry: (failureCount, error) => {
      if (isMetaTokenExpiredError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useInstagramClientSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading } = useInstagramInsightClients();
  const clients = data?.clients ?? [];

  const selectedClientId = useMemo(() => {
    const fromUrl = searchParams.get("clientId");
    if (fromUrl && clients.some((client) => client.id === fromUrl)) {
      return fromUrl;
    }
    return clients[0]?.id ?? "";
  }, [clients, searchParams]);

  const period = useMemo(
    () => parsePeriod(searchParams.get("month"), searchParams.get("year")),
    [searchParams],
  );

  const updateParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setSelectedClientId = useCallback(
    (clientId: string) => {
      updateParams({ clientId });
    },
    [updateParams],
  );

  const setPeriod = useCallback(
    (next: FinancePeriod) => {
      const current = getCurrentPeriod();
      const clamped =
        next.year > current.year ||
        (next.year === current.year && next.month > current.month)
          ? current
          : next;
      updateParams({
        month: String(clamped.month),
        year: String(clamped.year),
      });
    },
    [updateParams],
  );

  useEffect(() => {
    if (isLoading || clients.length === 0) {
      return;
    }
    const fromUrl = searchParams.get("clientId");
    if (!fromUrl || !clients.some((client) => client.id === fromUrl)) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, isLoading, searchParams, setSelectedClientId]);

  return {
    clients,
    selectedClientId,
    setSelectedClientId,
    period,
    setPeriod,
    isLoadingClients: isLoading,
  };
}

export function useInstagramContentTypeFilter() {
  const [contentType, setContentType] = useState<InstagramContentType | "all">(
    "all",
  );
  return { contentType, setContentType };
}
