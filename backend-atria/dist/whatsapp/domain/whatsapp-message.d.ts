export declare enum WhatsAppDirection {
    INBOUND = "INBOUND",
    OUTBOUND = "OUTBOUND"
}
export declare enum WhatsAppStatus {
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
    FAILED = "FAILED"
}
export declare enum WhatsAppInboxStatus {
    OPEN = "OPEN",
    PENDING = "PENDING",
    RESOLVED = "RESOLVED",
    SNOOZED = "SNOOZED"
}
export declare enum WhatsAppInboxPriority {
    NONE = "NONE",
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum WhatsAppMessageKind {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    DOCUMENT = "DOCUMENT",
    AUDIO = "AUDIO",
    VIDEO = "VIDEO",
    LOCATION = "LOCATION",
    TEMPLATE = "TEMPLATE",
    STICKER = "STICKER"
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
export declare function mapMetaStatus(status: unknown): WhatsAppStatus | null;
export declare function kindFromMime(mimeType: string | undefined): WhatsAppMessageKind;
