export enum WhatsAppDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum WhatsAppStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export type WhatsAppMessageRecord = {
  id: string;
  whatsappMessageId: string | null;
  fromPhone: string;
  toPhone: string;
  body: string;
  direction: WhatsAppDirection;
  status: WhatsAppStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type WhatsAppConversationSummary = {
  phone: string;
  lastMessage: string;
  lastMessageAt: Date;
  direction: WhatsAppDirection;
};

export function mapMetaStatus(status: unknown): WhatsAppStatus | null {
  if (status === 'sent') return WhatsAppStatus.SENT;
  if (status === 'delivered') return WhatsAppStatus.DELIVERED;
  if (status === 'read') return WhatsAppStatus.READ;
  if (status === 'failed') return WhatsAppStatus.FAILED;
  return null;
}

export function extractInboundText(message: {
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
}): string | null {
  if (message.type === 'text' && message.text?.body) {
    return message.text.body;
  }
  if (message.type === 'image' && message.image?.caption) {
    return message.image.caption;
  }
  return null;
}
