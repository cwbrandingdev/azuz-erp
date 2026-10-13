import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { whatsappKeys } from "@/lib/query-keys";
import * as whatsappService from "@/services/whatsapp.service";
import type {
  WhatsAppConversationFilters,
  WhatsAppInboxStatus,
  WhatsAppRoutingRule,
  WhatsAppStageMessage,
} from "@/services/whatsapp.service";

export function useWhatsappConversations(filters: WhatsAppConversationFilters) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: [
      ...whatsappKeys.conversations(companyId ?? ""),
      filters.tab ?? "OPEN",
      filters.q ?? "",
      filters.operatorId ?? "",
      filters.label ?? "",
      filters.stageId ?? "",
      filters.source ?? "",
      filters.leadStatus ?? "",
    ],
    queryFn: () => whatsappService.listConversations(filters),
    enabled: Boolean(companyId),
    refetchInterval: 4000,
  });
}

export function useWhatsappInboxCounts() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "counts"],
    queryFn: () => whatsappService.getInboxCounts(),
    enabled: Boolean(companyId),
    refetchInterval: 4000,
  });
}

export function useWhatsappInboxSettings() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "settings"],
    queryFn: () => whatsappService.getInboxSettings(),
    enabled: Boolean(companyId),
  });
}

export function useWhatsappRoutingRules() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "rules"],
    queryFn: () => whatsappService.listRoutingRules(),
    enabled: Boolean(companyId),
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

export function useWhatsappCrm(phone: string | null) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "crm", phone ?? ""],
    queryFn: () => whatsappService.getCrmContext(phone as string),
    enabled: Boolean(companyId && phone),
    refetchInterval: 8000,
  });
}

export function useWhatsappStageMessages() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "stage-messages"],
    queryFn: () => whatsappService.listStageMessages(),
    enabled: Boolean(companyId),
  });
}

export function useWhatsappBotFlows() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "bot-flows"],
    queryFn: () => whatsappService.listBotFlows(),
    enabled: Boolean(companyId),
  });
}

export function useWhatsappBroadcasts() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "broadcasts"],
    queryFn: () => whatsappService.listBroadcasts(),
    enabled: Boolean(companyId),
    refetchInterval: 8000,
  });
}

export function useWhatsappTriggers() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "triggers"],
    queryFn: () => whatsappService.listTriggers(),
    enabled: Boolean(companyId),
  });
}

export function useWhatsappTemplates(enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "templates"],
    queryFn: () => whatsappService.listTemplates(),
    enabled: Boolean(companyId) && enabled,
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

  const sendMedia = useMutation({
    mutationFn: (data: { to: string; file: File; caption?: string }) =>
      whatsappService.sendMedia(data),
    onSuccess: () => invalidate(),
  });

  const sendLocation = useMutation({
    mutationFn: (data: {
      to: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }) => whatsappService.sendLocation(data),
    onSuccess: () => invalidate(),
  });

  const sendTemplate = useMutation({
    mutationFn: (data: {
      to: string;
      name: string;
      language: string;
      parameters: string[];
    }) => whatsappService.sendTemplate(data),
    onSuccess: () => invalidate(),
  });

  const sendCanned = useMutation({
    mutationFn: (data: { to: string; cannedId: string }) =>
      whatsappService.sendCanned(data),
    onSuccess: () => invalidate(),
  });

  const createCanned = useMutation({
    mutationFn: (data: {
      shortCode: string;
      title: string;
      content: string;
      file?: File | null;
    }) => whatsappService.createCannedResponse(data),
    onSuccess: () => invalidate(),
  });

  const deleteCanned = useMutation({
    mutationFn: (id: string) => whatsappService.deleteCannedResponse(id),
    onSuccess: () => invalidate(),
  });

  const addNote = useMutation({
    mutationFn: (data: { phone: string; message: string }) =>
      whatsappService.addPrivateNote(data.phone, data.message),
    onSuccess: () => invalidate(),
  });

  const runCopilot = useMutation({
    mutationFn: (data: {
      phone: string;
      action: whatsappService.WhatsAppCopilotAction;
      text?: string;
      tone?: "formal" | "casual" | "empathetic";
    }) =>
      whatsappService.runCopilot(data.phone, {
        action: data.action,
        text: data.text,
        tone: data.tone,
      }),
  });

  const transferConversation = useMutation({
    mutationFn: (data: {
      phone: string;
      note: string;
      targetUserId?: string | null;
      targetUserGroupId?: string | null;
    }) =>
      whatsappService.transferConversation(data.phone, {
        note: data.note,
        targetUserId: data.targetUserId,
        targetUserGroupId: data.targetUserGroupId,
      }),
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

  const updateSettings = useMutation({
    mutationFn: (data: Parameters<typeof whatsappService.updateInboxSettings>[0]) =>
      whatsappService.updateInboxSettings(data),
    onSuccess: () => invalidate(),
  });

  const saveRules = useMutation({
    mutationFn: (rules: WhatsAppRoutingRule[]) =>
      whatsappService.saveRoutingRules(rules),
    onSuccess: () => invalidate(),
  });

  const updateCrmContact = useMutation({
    mutationFn: ({
      phone,
      ...data
    }: { phone: string } & Parameters<
      typeof whatsappService.updateCrmContact
    >[1]) => whatsappService.updateCrmContact(phone, data),
    onSuccess: () => invalidate(),
  });

  const saveStageMessages = useMutation({
    mutationFn: (rules: WhatsAppStageMessage[]) =>
      whatsappService.saveStageMessages(rules),
    onSuccess: () => invalidate(),
  });

  const saveBotFlow = useMutation({
    mutationFn: (data: {
      id?: string;
      name?: string;
      enabled?: boolean;
      definition?: import("@/services/whatsapp.service").WhatsAppBotDefinition;
    }) =>
      data.id
        ? whatsappService.updateBotFlow(data.id, data)
        : whatsappService.createBotFlow(data),
    onSuccess: () => invalidate(),
  });

  const removeBotFlow = useMutation({
    mutationFn: (id: string) => whatsappService.deleteBotFlow(id),
    onSuccess: () => invalidate(),
  });

  const saveBroadcast = useMutation({
    mutationFn: (data: { id?: string } & Partial<
      import("@/services/whatsapp.service").WhatsAppBroadcast
    >) =>
      data.id
        ? whatsappService.updateBroadcast(data.id, data)
        : whatsappService.createBroadcast(data),
    onSuccess: () => invalidate(),
  });

  const startBroadcast = useMutation({
    mutationFn: (id: string) => whatsappService.startBroadcast(id),
    onSuccess: () => invalidate(),
  });

  const pauseBroadcast = useMutation({
    mutationFn: (id: string) => whatsappService.pauseBroadcast(id),
    onSuccess: () => invalidate(),
  });

  const removeBroadcast = useMutation({
    mutationFn: (id: string) => whatsappService.deleteBroadcast(id),
    onSuccess: () => invalidate(),
  });

  const saveTrigger = useMutation({
    mutationFn: (data: { id?: string } & Partial<
      import("@/services/whatsapp.service").WhatsAppTrigger
    >) =>
      data.id
        ? whatsappService.updateTrigger(data.id, data)
        : whatsappService.createTrigger(data),
    onSuccess: () => invalidate(),
  });

  const removeTrigger = useMutation({
    mutationFn: (id: string) => whatsappService.deleteTrigger(id),
    onSuccess: () => invalidate(),
  });

  const fireAbandonedCart = useMutation({
    mutationFn: (data: { phone: string; entityKey?: string }) =>
      whatsappService.fireTrigger({
        eventType: "CART_ABANDONED",
        phone: data.phone,
        entityKey: data.entityKey,
      }),
    onSuccess: () => invalidate(),
  });

  return {
    sendMessage,
    sendMedia,
    sendLocation,
    sendTemplate,
    sendCanned,
    createCanned,
    deleteCanned,
    addNote,
    runCopilot,
    transferConversation,
    updateConversation,
    updateSettings,
    saveRules,
    updateCrmContact,
    saveStageMessages,
    saveBotFlow,
    removeBotFlow,
    saveBroadcast,
    startBroadcast,
    pauseBroadcast,
    removeBroadcast,
    saveTrigger,
    removeTrigger,
    fireAbandonedCart,
    invalidate,
  };
}
