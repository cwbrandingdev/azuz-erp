import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { proposalKeys } from "@/lib/query-keys";
import { proposalsService } from "@/services";

export function useProposals() {
  const companyId = useCompanyId();

  const query = useQuery({
    queryKey: proposalKeys.list(companyId ?? ""),
    queryFn: () => proposalsService.getProposals(),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });

  // #region agent log
  useEffect(() => {
    fetch(
      "http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "36aa7b",
        },
        body: JSON.stringify({
          sessionId: "36aa7b",
          hypothesisId: "C",
          location: "hooks/use-proposals.ts",
          message: "useProposals query state",
          data: {
            companyId: companyId ?? null,
            enabled: Boolean(companyId),
            isPending: query.isPending,
            isError: query.isError,
            isFetching: query.isFetching,
            status: query.status,
            errorStatus:
              query.error && typeof query.error === "object" && "status" in query.error
                ? (query.error as { status: number }).status
                : null,
            resultCount: Array.isArray(query.data) ? query.data.length : null,
          },
          timestamp: Date.now(),
        }),
      },
    ).catch(() => {});
  }, [
    companyId,
    query.isPending,
    query.isError,
    query.isFetching,
    query.status,
    query.error,
    query.data,
  ]);
  // #endregion

  return query;
}
