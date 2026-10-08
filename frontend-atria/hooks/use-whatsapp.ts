import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { whatsappKeys } from "@/lib/query-keys";
import * as whatsappService from "@/services/whatsapp.service";
import type {
  WhatsAppAssigneeFilter,
  WhatsAppInboxStatus,
} from "@/services/whatsapp.service";

export function useWhatsappConversations(filters: {
  status?: WhatsAppInboxStatus;
  assignee?: WhatsAppAssigneeFilter;
  q?: string;
}) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: [
      ...whatsappKeys.conversations(companyId ?? ""),
      filters.status ?? null,
      filters.assignee ?? "all",
      filters.q ?? "",
    ],
    queryFn: () => whatsappService.listConversations(filters),
    enabled: Boolean(companyId),
    refetchInterval: 4000,
  });
}

export function useWhatsappCannedResponses() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "canned"],
    queryFn: () => whatsappService.listCannedResponses(),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });
}

export function useWhatsappMutations() {
  const queryClient = useQueryClient();

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: whatsappKeys.root });
  }

  const sendMessage = useMutation({
    mutationFn: (data: { to: string; message: string }) =>
      whatsappService.sendMessage(data),
    onSuccess: () => invalidate(),
  });

  const addNote = useMutation({
    mutationFn: (data: { phone: string; message: string }) =>
      whatsappService.addPrivateNote(data.phone, data.message),
    onSuccess: () => invalidate(),
  });

  const updateConversation = useMutation({
    mutationFn: ({
      phone,
      ...data
    }: {
      phone: string;
      name?: string;
      status?: WhatsAppInboxStatus;
      priority?: import("@/services/whatsapp.service").WhatsAppInboxPriority;
      assignedUserId?: string | null;
      labels?: string[];
    }) => whatsappService.updateConversation(phone, data),
    onSuccess: () => invalidate(),
  });

  return { sendMessage, addNote, updateConversation, invalidate };
}
