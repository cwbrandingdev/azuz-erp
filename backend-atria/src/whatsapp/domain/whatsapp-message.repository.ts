import type {
  WhatsAppConversationSummary,
  WhatsAppMessageRecord,
  WhatsAppStatus,
} from './whatsapp-message';

export abstract class WhatsAppMessageRepository {
  abstract create(
    data: Omit<WhatsAppMessageRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WhatsAppMessageRecord>;

  abstract findByWhatsappMessageId(
    whatsappMessageId: string,
  ): Promise<WhatsAppMessageRecord | null>;

  abstract findConversation(phone: string): Promise<WhatsAppMessageRecord[]>;

  abstract listConversations(): Promise<WhatsAppConversationSummary[]>;

  abstract updateStatusByWhatsappMessageId(
    whatsappMessageId: string,
    status: WhatsAppStatus,
  ): Promise<void>;
}
