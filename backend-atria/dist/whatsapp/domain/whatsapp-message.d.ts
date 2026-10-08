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
export declare function mapMetaStatus(status: unknown): WhatsAppStatus | null;
export declare function extractInboundText(message: {
    type?: string;
    text?: {
        body?: string;
    };
    image?: {
        caption?: string;
    };
}): string | null;
