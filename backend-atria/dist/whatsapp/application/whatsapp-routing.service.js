"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WhatsAppRoutingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppRoutingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_routing_1 = require("../domain/whatsapp-routing");
const whatsapp_message_repository_1 = require("../domain/whatsapp-message.repository");
const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';
let WhatsAppRoutingService = WhatsAppRoutingService_1 = class WhatsAppRoutingService {
    prisma;
    messages;
    logger = new common_1.Logger(WhatsAppRoutingService_1.name);
    constructor(prisma, messages) {
        this.prisma = prisma;
        this.messages = messages;
    }
    async getSettings(companyId) {
        const row = await this.ensureSettings(companyId);
        return this.toSettings(row);
    }
    async updateSettings(companyId, patch) {
        await this.ensureSettings(companyId);
        const row = await this.prisma.whatsAppInboxSettings.update({
            where: { companyId },
            data: {
                ...(patch.routingMode
                    ? { routingMode: patch.routingMode }
                    : {}),
                ...(patch.slaFirstResponseMinutes != null
                    ? { slaFirstResponseMinutes: patch.slaFirstResponseMinutes }
                    : {}),
                ...(patch.autoReassignEnabled != null
                    ? { autoReassignEnabled: patch.autoReassignEnabled }
                    : {}),
                ...(patch.autoReassignMinutes != null
                    ? { autoReassignMinutes: patch.autoReassignMinutes }
                    : {}),
                ...(patch.agentUserIds
                    ? { agentUserIds: patch.agentUserIds }
                    : {}),
                ...(patch.botEnabled != null ? { botEnabled: patch.botEnabled } : {}),
                ...(patch.aiAutoReply != null ? { aiAutoReply: patch.aiAutoReply } : {}),
            },
        });
        return this.toSettings(row);
    }
    async listRules(companyId) {
        const rows = await this.prisma.whatsAppRoutingRule.findMany({
            where: { companyId },
            orderBy: { priority: 'asc' },
        });
        return rows.map((row) => this.toRule(row));
    }
    async replaceRules(companyId, rules) {
        await this.prisma.whatsAppRoutingRule.deleteMany({ where: { companyId } });
        if (rules.length === 0)
            return [];
        await this.prisma.whatsAppRoutingRule.createMany({
            data: rules.map((rule, index) => ({
                companyId,
                matchLabel: rule.matchLabel?.trim() || null,
                matchStageId: rule.matchStageId || null,
                matchSource: rule.matchSource?.trim() || null,
                targetUserGroupId: rule.targetUserGroupId || null,
                targetUserId: rule.targetUserId || null,
                priority: rule.priority ?? index,
            })),
        });
        return this.listRules(companyId);
    }
    async inboxCounts(companyId, userId) {
        const settings = await this.getSettings(companyId);
        const [open, mine, unassigned, waiting, closed, waitingRows] = await Promise.all([
            this.prisma.whatsAppConversation.count({
                where: { status: client_1.WhatsAppConversationStatus.OPEN },
            }),
            this.prisma.whatsAppConversation.count({
                where: {
                    assignedUserId: userId,
                    status: { not: client_1.WhatsAppConversationStatus.RESOLVED },
                },
            }),
            this.prisma.whatsAppConversation.count({
                where: {
                    assignedUserId: null,
                    status: { not: client_1.WhatsAppConversationStatus.RESOLVED },
                },
            }),
            this.prisma.whatsAppConversation.count({
                where: { status: client_1.WhatsAppConversationStatus.PENDING },
            }),
            this.prisma.whatsAppConversation.count({
                where: { status: client_1.WhatsAppConversationStatus.RESOLVED },
            }),
            this.prisma.whatsAppConversation.findMany({
                where: {
                    queuedAt: { not: null },
                    status: { not: client_1.WhatsAppConversationStatus.RESOLVED },
                },
                select: {
                    queuedAt: true,
                    assignedAt: true,
                    assignedUserId: true,
                    lastAgentReplyAt: true,
                },
            }),
        ]);
        const slaMs = settings.slaFirstResponseMinutes * 60_000;
        const slaBreached = waitingRows.filter((row) => {
            if (!row.queuedAt ||
                (row.lastAgentReplyAt && row.lastAgentReplyAt >= row.queuedAt)) {
                return false;
            }
            const from = row.assignedUserId && row.assignedAt ? row.assignedAt : row.queuedAt;
            return Date.now() - from.getTime() > slaMs;
        }).length;
        return { open, mine, unassigned, waiting, closed, slaBreached };
    }
    async attachLeads(conversations, companyId = DEFAULT_COMPANY) {
        if (conversations.length === 0)
            return conversations;
        const leads = await this.prisma.lead.findMany({
            where: { deletedAt: null, phone: { not: null }, companyId },
            select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                source: true,
                stageId: true,
                stage: { select: { name: true } },
            },
            take: 4000,
        });
        const byPhone = new Map();
        for (const lead of leads) {
            const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(lead.phone ?? '');
            if (!phone || byPhone.has(phone))
                continue;
            byPhone.set(phone, {
                id: lead.id,
                name: lead.name,
                status: lead.status,
                source: lead.source,
                stageId: lead.stageId,
                stageName: lead.stage?.name ?? null,
            });
        }
        return conversations.map((item) => ({
            ...item,
            lead: byPhone.get((0, whatsapp_phone_1.normalizeWhatsAppPhone)(item.phone)) ?? null,
        }));
    }
    async assignIncoming(conversation, companyId = DEFAULT_COMPANY) {
        if (conversation.assignedUser)
            return;
        const settings = await this.getSettings(companyId);
        if (settings.routingMode === whatsapp_routing_1.WhatsAppRoutingMode.MANUAL)
            return;
        const userId = await this.pickAgent(companyId, conversation);
        if (!userId)
            return;
        await this.messages.updateConversation(conversation.phone, {
            assignedUserId: userId,
        });
    }
    async reassignOverdue() {
        const settingsRows = await this.prisma.whatsAppInboxSettings.findMany({
            where: { autoReassignEnabled: true },
        });
        if (settingsRows.length === 0)
            return;
        for (const settings of settingsRows) {
            const cutoff = new Date(Date.now() - settings.autoReassignMinutes * 60_000);
            const overdue = await this.prisma.whatsAppConversation.findMany({
                where: {
                    assignedUserId: { not: null },
                    assignedAt: { lte: cutoff },
                    queuedAt: { not: null },
                    status: {
                        in: [
                            client_1.WhatsAppConversationStatus.OPEN,
                            client_1.WhatsAppConversationStatus.PENDING,
                        ],
                    },
                },
            });
            for (const row of overdue) {
                if (row.lastAgentReplyAt &&
                    row.queuedAt &&
                    row.lastAgentReplyAt >= row.queuedAt) {
                    continue;
                }
                const summary = {
                    id: row.id,
                    phone: row.phone,
                    name: row.name,
                    status: row.status,
                    priority: row.priority,
                    labels: row.labels,
                    unreadCount: row.unreadCount,
                    lastMessage: row.lastMessagePreview,
                    lastMessageAt: row.lastMessageAt,
                    direction: null,
                    assignedUser: row.assignedUserId
                        ? { id: row.assignedUserId, name: '', avatarUrl: null }
                        : null,
                    queuedAt: row.queuedAt,
                    assignedAt: row.assignedAt,
                    lastAgentReplyAt: row.lastAgentReplyAt,
                    waitingSeconds: 0,
                    slaBreached: true,
                    needsAgentReply: true,
                    lead: null,
                };
                const [withLead] = await this.attachLeads([summary], settings.companyId);
                const nextId = await this.pickAgent(settings.companyId, withLead, row.assignedUserId);
                if (!nextId || nextId === row.assignedUserId)
                    continue;
                await this.messages.updateConversation(row.phone, {
                    assignedUserId: nextId,
                });
                this.logger.log(`Reassigned WhatsApp conversation ${row.phone} -> ${nextId}`);
            }
        }
    }
    async pickAgent(companyId, conversation, excludeUserId) {
        const settings = await this.getSettings(companyId);
        const agents = await this.eligibleAgents(settings, excludeUserId);
        if (agents.length === 0)
            return null;
        if (settings.routingMode === whatsapp_routing_1.WhatsAppRoutingMode.SPECIALTY) {
            const rules = await this.listRules(companyId);
            const matched = rules.find((rule) => this.ruleMatches(rule, conversation));
            if (matched?.targetUserId) {
                const direct = agents.find((agent) => agent.id === matched.targetUserId);
                if (direct)
                    return direct.id;
            }
            if (matched?.targetUserGroupId) {
                const inGroup = agents.filter((agent) => agent.groupIds.includes(matched.targetUserGroupId));
                if (inGroup.length > 0) {
                    return this.nextRoundRobin(companyId, inGroup.map((agent) => agent.id));
                }
            }
        }
        if (settings.routingMode === whatsapp_routing_1.WhatsAppRoutingMode.WORKLOAD) {
            const counts = await this.prisma.whatsAppConversation.groupBy({
                by: ['assignedUserId'],
                where: {
                    assignedUserId: { in: agents.map((agent) => agent.id) },
                    status: { not: client_1.WhatsAppConversationStatus.RESOLVED },
                },
                _count: { _all: true },
            });
            const countById = new Map(counts.map((item) => [item.assignedUserId ?? '', item._count._all]));
            return [...agents].sort((left, right) => (countById.get(left.id) ?? 0) - (countById.get(right.id) ?? 0))[0].id;
        }
        return this.nextRoundRobin(companyId, agents.map((agent) => agent.id));
    }
    ruleMatches(rule, conversation) {
        if (rule.matchLabel && !conversation.labels.includes(rule.matchLabel)) {
            return false;
        }
        if (rule.matchStageId && conversation.lead?.stageId !== rule.matchStageId) {
            return false;
        }
        if (rule.matchSource &&
            conversation.lead?.source?.toLowerCase() !==
                rule.matchSource.toLowerCase()) {
            return false;
        }
        return Boolean(rule.matchLabel || rule.matchStageId || rule.matchSource);
    }
    async eligibleAgents(settings, excludeUserId) {
        const users = await this.prisma.user.findMany({
            where: {
                companyId: settings.companyId,
                category: client_1.UserCategory.MEMBER,
                isActive: true,
                ...(settings.agentUserIds.length > 0
                    ? { id: { in: settings.agentUserIds } }
                    : {}),
                ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
            },
            select: {
                id: true,
                userGroupId: true,
                userGroups: { select: { userGroupId: true } },
            },
            orderBy: { name: 'asc' },
        });
        return users.map((user) => ({
            id: user.id,
            groupIds: [
                ...(user.userGroupId ? [user.userGroupId] : []),
                ...user.userGroups.map((item) => item.userGroupId),
            ],
        }));
    }
    async nextRoundRobin(companyId, userIds) {
        const settings = await this.ensureSettings(companyId);
        const index = settings.roundRobinIndex % userIds.length;
        const chosen = userIds[index];
        await this.prisma.whatsAppInboxSettings.update({
            where: { companyId },
            data: { roundRobinIndex: (index + 1) % userIds.length },
        });
        return chosen;
    }
    async ensureSettings(companyId) {
        return this.prisma.whatsAppInboxSettings.upsert({
            where: { companyId },
            create: { companyId },
            update: {},
        });
    }
    toSettings(row) {
        return {
            id: row.id,
            companyId: row.companyId,
            routingMode: row.routingMode,
            slaFirstResponseMinutes: row.slaFirstResponseMinutes,
            autoReassignEnabled: row.autoReassignEnabled,
            autoReassignMinutes: row.autoReassignMinutes,
            agentUserIds: row.agentUserIds,
            botEnabled: row.botEnabled,
            aiAutoReply: row.aiAutoReply,
        };
    }
    toRule(row) {
        return { ...row };
    }
};
exports.WhatsAppRoutingService = WhatsAppRoutingService;
__decorate([
    (0, schedule_1.Cron)('*/1 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppRoutingService.prototype, "reassignOverdue", null);
exports.WhatsAppRoutingService = WhatsAppRoutingService = WhatsAppRoutingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_message_repository_1.WhatsAppMessageRepository])
], WhatsAppRoutingService);
//# sourceMappingURL=whatsapp-routing.service.js.map