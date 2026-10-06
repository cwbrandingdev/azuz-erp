import { apiRequest } from "./api";
import type {
  SendWhatsappMessageInput,
  WhatsappConfig,
  WhatsappConversation,
  WhatsappMessage,
} from "./types";

export async function getWhatsappConfig() {
  return apiRequest<WhatsappConfig>("/whatsapp/config", { skipToast: true });
}

export async function listWhatsappConversations(filters?: {
  leadId?: string;
  clientId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.leadId) params.set("leadId", filters.leadId);
  if (filters?.clientId) params.set("clientId", filters.clientId);
  const query = params.toString();
  return apiRequest<WhatsappConversation[]>(
    `/whatsapp/conversations${query ? `?${query}` : ""}`,
    { skipToast: true },
  );
}

export async function listWhatsappMessages(conversationId: string) {
  return apiRequest<WhatsappMessage[]>(
    `/whatsapp/conversations/${conversationId}/messages`,
    { skipToast: true },
  );
}

export async function sendWhatsappMessage(data: SendWhatsappMessageInput) {
  return apiRequest<WhatsappMessage>("/whatsapp/messages", {
    method: "POST",
    body: data,
  });
}
