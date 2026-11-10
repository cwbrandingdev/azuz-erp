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

export enum WhatsAppMessageKind {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  LOCATION = 'LOCATION',
  TEMPLATE = 'TEMPLATE',
  STICKER = 'STICKER',
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
  kind: WhatsAppMessageKind;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  locationAddress: string | null;
  isViewOnce: boolean;
  isVoiceNote: boolean;
  transcription: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  direction: WhatsAppDirection;
  status: WhatsAppStatus;
  isPrivate: boolean;
  sentByUserId: string | null;
  sentByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WhatsAppLinkedLead = {
  id: string;
  name: string;
  status: string;
  source: string;
  stageId: string | null;
  stageName: string | null;
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
  lastMessageStatus: WhatsAppStatus | null;
  assignedUser: WhatsAppAssignedUser | null;
  queuedAt: Date | null;
  assignedAt: Date | null;
  lastAgentReplyAt: Date | null;
  waitingSeconds: number;
  slaBreached: boolean;
  needsAgentReply: boolean;
  lead: WhatsAppLinkedLead | null;
};

export type WhatsAppCannedResponseRecord = {
  id: string;
  shortCode: string;
  title: string;
  content: string;
  kind: WhatsAppMessageKind;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
};

export type ConversationListFilter = {
  tab?: 'OPEN' | 'MINE' | 'UNASSIGNED' | 'WAITING' | 'CLOSED';
  status?: WhatsAppInboxStatus;
  assignee?: 'mine' | 'unassigned' | 'all';
  userId?: string;
  query?: string;
  operatorId?: string;
  label?: string;
  stageId?: string;
  source?: string;
  leadStatus?: string;
  slaMinutes?: number;
};

export type ConversationPatch = {
  name?: string | null;
  status?: WhatsAppInboxStatus;
  priority?: WhatsAppInboxPriority;
  assignedUserId?: string | null;
  labels?: string[];
  queuedAt?: Date | null;
  assignedAt?: Date | null;
  lastAgentReplyAt?: Date | null;
  lastCustomerMessageAt?: Date | null;
};

/** WAHA ack: 1 server, 2 device, 3 read, 4 played, -1 error. */
export function mapWahaAck(ack: unknown): WhatsAppStatus | null {
  const value = typeof ack === 'number' ? ack : Number(ack);
  if (value === 1) return WhatsAppStatus.SENT;
  if (value === 2) return WhatsAppStatus.DELIVERED;
  if (value === 3 || value === 4) return WhatsAppStatus.READ;
  if (value === -1) return WhatsAppStatus.FAILED;
  return null;
}

export function kindFromMime(mimeType: string | undefined): WhatsAppMessageKind {
  const mime = mimeType?.split(';')[0].trim().toLowerCase() ?? '';
  if (mime.startsWith('image/')) return WhatsAppMessageKind.IMAGE;
  if (mime.startsWith('audio/')) return WhatsAppMessageKind.AUDIO;
  if (mime.startsWith('video/')) return WhatsAppMessageKind.VIDEO;
  return WhatsAppMessageKind.DOCUMENT;
}
