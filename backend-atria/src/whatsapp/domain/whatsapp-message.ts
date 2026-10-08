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

export enum WhatsAppInboxStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  SNOOZED = 'SNOOZED',
}

export enum WhatsAppInboxPriority {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export type WhatsAppAssignedUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type WhatsAppMessageRecord = {
  id: string;
  whatsappMessageId: string | null;
  fromPhone: string;
  toPhone: string;
  body: string;
  direction: WhatsAppDirection;
  status: WhatsAppStatus;
  isPrivate: boolean;
  sentByUserId: string | null;
  sentByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WhatsAppConversationSummary = {
  id: string;
  phone: string;
  name: string | null;
  status: WhatsAppInboxStatus;
  priority: WhatsAppInboxPriority;
  labels: string[];
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: Date;
  direction: WhatsAppDirection | null;
  assignedUser: WhatsAppAssignedUser | null;
};

export type WhatsAppCannedResponseRecord = {
  id: string;
  shortCode: string;
  title: string;
  content: string;
};

export type ConversationListFilter = {
  status?: WhatsAppInboxStatus;
  assignee?: 'mine' | 'unassigned' | 'all';
  userId?: string;
  query?: string;
};

export type ConversationPatch = {
  name?: string | null;
  status?: WhatsAppInboxStatus;
  priority?: WhatsAppInboxPriority;
  assignedUserId?: string | null;
  labels?: string[];
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
  interactive?: {
    type?: string;
    call_permission_reply?: { response?: string };
  };
}): string | null {
  if (message.type === 'text' && message.text?.body) {
    return message.text.body;
  }
  if (message.type === 'image' && message.image?.caption) {
    return message.image.caption;
  }
  if (
    message.type === 'interactive' &&
    message.interactive?.type === 'call_permission_reply'
  ) {
    const response = message.interactive.call_permission_reply?.response;
    if (response === 'accept') return 'Permissão para ligação aceita';
    if (response === 'reject') return 'Permissão para ligação recusada';
    return 'Resposta de permissão de ligação';
  }
  return null;
}
