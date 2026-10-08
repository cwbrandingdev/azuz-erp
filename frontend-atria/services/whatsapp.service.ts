import { apiRequest } from "./api";

export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";
export type WhatsAppMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface WhatsAppMessage {
  id: string;
  whatsappMessageId: string | null;
  fromPhone: string;
  toPhone: string;
  body: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversation {
  phone: string;
  lastMessage: string;
  lastMessageAt: string;
  direction: WhatsAppMessageDirection;
}

export async function listConversations(): Promise<WhatsAppConversation[]> {
  return apiRequest<WhatsAppConversation[]>("/whatsapp/conversations");
}

export async function getMessages(phone: string): Promise<WhatsAppMessage[]> {
  return apiRequest<WhatsAppMessage[]>(
    `/whatsapp/messages/${encodeURIComponent(phone)}`,
  );
}

export async function sendMessage(data: {
  to: string;
  message: string;
}): Promise<WhatsAppMessage> {
  return apiRequest<WhatsAppMessage>("/whatsapp/send", {
    method: "POST",
    body: data,
  });
}
