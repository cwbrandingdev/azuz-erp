import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppRoutingMode, type WhatsAppInboxCounts, type WhatsAppInboxSettingsRecord, type WhatsAppRoutingRuleRecord } from '../domain/whatsapp-routing';
import type { WhatsAppConversationSummary } from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
export declare class WhatsAppRoutingService {
    private readonly prisma;
    private readonly messages;
    private readonly logger;
    constructor(prisma: PrismaService, messages: WhatsAppMessageRepository);
    getSettings(companyId: string): Promise<WhatsAppInboxSettingsRecord>;
    updateSettings(companyId: string, patch: Partial<{
        routingMode: WhatsAppRoutingMode;
        slaFirstResponseMinutes: number;
        autoReassignEnabled: boolean;
        autoReassignMinutes: number;
        agentUserIds: string[];
        botEnabled: boolean;
        aiAutoReply: boolean;
    }>): Promise<WhatsAppInboxSettingsRecord>;
    listRules(companyId: string): Promise<WhatsAppRoutingRuleRecord[]>;
    replaceRules(companyId: string, rules: Array<{
        matchLabel?: string | null;
        matchStageId?: string | null;
        matchSource?: string | null;
        targetUserGroupId?: string | null;
        targetUserId?: string | null;
        priority?: number;
    }>): Promise<WhatsAppRoutingRuleRecord[]>;
    inboxCounts(companyId: string, userId: string): Promise<WhatsAppInboxCounts>;
    attachLeads(conversations: WhatsAppConversationSummary[], companyId?: string): Promise<WhatsAppConversationSummary[]>;
    assignIncoming(conversation: WhatsAppConversationSummary, companyId?: string): Promise<void>;
    reassignOverdue(): Promise<void>;
    private pickAgent;
    private ruleMatches;
    private eligibleAgents;
    private nextRoundRobin;
    private ensureSettings;
    private toSettings;
    private toRule;
}
