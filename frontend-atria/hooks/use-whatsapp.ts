import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { whatsappKeys } from "@/lib/query-keys";
import * as whatsappService from "@/services/whatsapp.service";

export function useWhatsappConversations() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: whatsappKeys.conversations(companyId ?? ""),
    queryFn: () => whatsappService.listConversations(),
    enabled: Boolean(companyId),
    refetchInterval: 4000,
  });
}

export function useWhatsappMutations() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  const sendMessage = useMutation({
    mutationFn: (data: { to: string; message: string }) =>
      whatsappService.sendMessage(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: whatsappKeys.root,
      });
    },
  });

  return { sendMessage };
}
