import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
export type WhatsAppStageMessageRecord = {
    id: string;
    companyId: string;
    stageId: string;
    stageName: string | null;
    enabled: boolean;
    body: string | null;
    templateName: string | null;
    templateLanguage: string | null;
};
export type WhatsAppCrmContact = {
    id: string;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    cnpj: string | null;
    jobTitle: string | null;
    source: string;
    orcamento: number | null;
    status: string;
    stageId: string | null;
    stageName: string | null;
    organizationId: string | null;
    organizationName: string | null;
};
export type WhatsAppCrmDeal = {
    id: string;
    kind: 'lead' | 'proposal' | 'contract';
    title: string;
    status: string;
    value: number | null;
};
export type WhatsAppCrmTimelineItem = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    actorName: string | null;
    createdAt: Date;
};
export declare class WhatsAppCrmService {
    private readonly prisma;
    private readonly whatsApp;
    private readonly logger;
    constructor(prisma: PrismaService, whatsApp: WhatsAppService);
    getContext(phone: string, companyId?: string): Promise<{
        contact: WhatsAppCrmContact | null;
        openDeals: WhatsAppCrmDeal[];
        timeline: WhatsAppCrmTimelineItem[];
    }>;
    updateContact(phone: string, companyId: string, patch: {
        name?: string;
        contactName?: string | null;
        email?: string | null;
        cnpj?: string | null;
        jobTitle?: string | null;
        source?: string;
        orcamento?: number | null;
    }, actorUserId?: string): Promise<WhatsAppCrmContact>;
    listStageMessages(companyId: string): Promise<WhatsAppStageMessageRecord[]>;
    replaceStageMessages(companyId: string, rules: Array<{
        stageId: string;
        enabled?: boolean;
        body?: string | null;
        templateName?: string | null;
        templateLanguage?: string | null;
    }>): Promise<WhatsAppStageMessageRecord[]>;
    notifyStageMove(input: {
        companyId: string;
        leadId: string;
        phone: string | null;
        fromStageName: string | null;
        toStageId: string;
        toStageName: string;
        actorUserId?: string;
    }): Promise<void>;
    private findLeadByPhone;
    private loadOpenDeals;
    private loadTimeline;
    private logEvent;
    private toContact;
    private varsFor;
    private interpolate;
    private extractPlaceholders;
}
