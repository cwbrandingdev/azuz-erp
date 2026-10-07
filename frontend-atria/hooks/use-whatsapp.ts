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

export function useWhatsappMessages(conversationId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: whatsappKeys.messages(companyId ?? "", conversationId ?? ""),
    queryFn: () => whatsappService.listMessages(conversationId as string),
    enabled: Boolean(companyId) && Boolean(conversationId),
    refetchInterval: 3000,
  });
}

export function useWhatsappMutations() {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  const createConversation = useMutation({
    mutationFn: (data: { phone: string; name?: string }) =>
      whatsappService.createConversation(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: whatsappKeys.conversations(companyId ?? ""),
      }),
  });

  const sendMessage = useMutation({
    mutationFn: (data: { to: string; body: string }) =>
      whatsappService.sendMessage(data),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: whatsappKeys.conversations(companyId ?? ""),
      });
      void queryClient.invalidateQueries({
        queryKey: whatsappKeys.messages(companyId ?? "", result.conversation.id),
      });
    },
  });

  return { createConversation, sendMessage };
}
