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
export declare function mapMetaStatus(status: unknown): WhatsAppStatus | null;
export declare function extractInboundText(message: {
    type?: string;
    text?: {
        body?: string;
    };
    image?: {
        caption?: string;
    };
    interactive?: {
        type?: string;
        call_permission_reply?: {
            response?: string;
        };
    };
}): string | null;
