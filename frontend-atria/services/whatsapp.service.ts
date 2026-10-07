import { apiRequest } from "./api";

export interface SendWhatsappMessageInput {
  to: string;
  body: string;
}

export interface SendWhatsappMessageResult {
  id: string | null;
  to: string;
}

export async function sendMessage(
  data: SendWhatsappMessageInput,
): Promise<SendWhatsappMessageResult> {
  return apiRequest<SendWhatsappMessageResult>("/whatsapp/messages", {
    method: "POST",
    body: data,
  });
}
