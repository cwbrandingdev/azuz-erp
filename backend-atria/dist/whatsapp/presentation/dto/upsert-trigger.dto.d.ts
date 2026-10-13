import { WhatsAppTriggerEvent } from '@prisma/client';
export declare class UpsertTriggerDto {
    name?: string;
    enabled?: boolean;
    eventType?: WhatsAppTriggerEvent;
    delayMinutes?: number;
    body?: string | null;
    templateName?: string | null;
    templateLanguage?: string | null;
    matchStageId?: string | null;
    matchLabel?: string | null;
}
export declare class FireTriggerDto {
    eventType: WhatsAppTriggerEvent;
    phone: string;
    entityKey?: string;
    vars?: Record<string, string>;
}
