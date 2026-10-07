import { apiRequest } from "./api";

export interface WhatsappConversation {
  id: string;
  waId: string;
  phone: string | null;
  name: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface WhatsappMessage {
  id: string;
  conversationId: string;
  direction: "IN" | "OUT" | string;
  type: string;
  body: string | null;
  waMessageId: string | null;
  status: string;
  createdAt: string;
}

export interface SendWhatsappMessageInput {
  to: string;
  body: string;
}

export interface SendWhatsappMessageResult {
  conversation: WhatsappConversation;
  message: WhatsappMessage;
}

export async function listConversations(): Promise<WhatsappConversation[]> {
  return apiRequest<WhatsappConversation[]>("/whatsapp/conversations");
}

export async function createConversation(data: {
  phone: string;
  name?: string;
}): Promise<WhatsappConversation> {
  return apiRequest<WhatsappConversation>("/whatsapp/conversations", {
    method: "POST",
    body: data,
  });
}

export async function listMessages(
  conversationId: string,
): Promise<WhatsappMessage[]> {
  return apiRequest<WhatsappMessage[]>(
    `/whatsapp/conversations/${conversationId}/messages`,
  );
}

export async function sendMessage(
  data: SendWhatsappMessageInput,
): Promise<SendWhatsappMessageResult> {
  return apiRequest<SendWhatsappMessageResult>("/whatsapp/messages", {
    method: "POST",
    body: data,
  });
}
