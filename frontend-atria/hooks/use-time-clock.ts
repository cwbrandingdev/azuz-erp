import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { timeClockKeys } from "@/lib/query-keys";
import { timeClockService } from "@/services";
import type {
  CreateManualTimeClockEntryInput,
  TeamTimeClockQuery,
  TimeClockEntryType,
  TimeClockRangeQuery,
  UpdateTimeClockEntryInput,
} from "@/services/types";

// Today's total includes the open shift up to "now", so it is refreshed
// periodically instead of ticking on the client.
const REFRESH_INTERVAL_MS = 60_000;

export function useMyTimeClock(query: TimeClockRangeQuery = {}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: timeClockKeys.mine(
      companyId ?? "",
      query.from ?? null,
      query.to ?? null,
    ),
    queryFn: () => timeClockService.getMyTimeClock(query),
    enabled: Boolean(companyId),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function useTeamTimeClock(query: TeamTimeClockQuery, enabled = true) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: timeClockKeys.team(
      companyId ?? "",
      query.from ?? null,
      query.to ?? null,
      query.userId ?? null,
    ),
    queryFn: () => timeClockService.getTeamTimeClock(query),
    enabled: Boolean(companyId) && enabled,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function useTimeClockMutations() {
  const queryClient = useQueryClient();

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: timeClockKeys.root });
  }

  const punch = useMutation({
    mutationFn: (type: TimeClockEntryType) => timeClockService.punch(type),
    onSuccess: () => invalidate(),
  });

  const createManual = useMutation({
    mutationFn: (data: CreateManualTimeClockEntryInput) =>
      timeClockService.createManualEntry(data),
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTimeClockEntryInput }) =>
      timeClockService.updateEntry(id, data),
    onSuccess: () => invalidate(),
  });

  return { punch, createManual, update };
}
