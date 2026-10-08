import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { internalApprovalKeys } from "@/lib/query-keys";
import { invalidateTasksCache } from "@/lib/task-cache";
import { internalApprovalsService } from "@/services";

export function useInternalApprovals(enabled = true) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: internalApprovalKeys.all(companyId ?? ""),
    queryFn: () => internalApprovalsService.listPending(),
    enabled: Boolean(companyId) && enabled,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useInternalApprovalMutations() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: internalApprovalKeys.all(companyId ?? ""),
      }),
      invalidateTasksCache(queryClient),
    ]);
  }

  const approve = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      internalApprovalsService.approve(id, note),
    onSuccess: () => refresh(),
  });

  const submitDelivery = useMutation({
    mutationFn: ({
      id,
      file,
      caption,
      onProgress,
    }: {
      id: string;
      file: File;
      caption?: string;
      onProgress?: (percent: number) => void;
    }) =>
      internalApprovalsService.submitDelivery(id, file, caption, onProgress),
    onSuccess: () => refresh(),
  });

  const requestAdjustment = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      internalApprovalsService.requestAdjustment(id, note),
    onSuccess: () => refresh(),
  });

  return { approve, submitDelivery, requestAdjustment };
}
