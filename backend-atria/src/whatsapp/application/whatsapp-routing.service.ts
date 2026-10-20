import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  UserCategory,
  WhatsAppConversationStatus,
  WhatsAppRoutingMode as PrismaRoutingMode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import {
  WhatsAppRoutingMode,
  type WhatsAppInboxCounts,
  type WhatsAppInboxSettingsRecord,
  type WhatsAppRoutingRuleRecord,
} from '../domain/whatsapp-routing';
import type { WhatsAppConversationSummary } from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';

const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';

type LinkedLead = NonNullable<WhatsAppConversationSummary['lead']>;

@Injectable()
export class WhatsAppRoutingService {
  private readonly logger = new Logger(WhatsAppRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: WhatsAppMessageRepository,
  ) {}

  async getSettings(companyId: string): Promise<WhatsAppInboxSettingsRecord> {
    const row = await this.ensureSettings(companyId);
    return this.toSettings(row);
  }

  async updateSettings(
    companyId: string,
    patch: Partial<{
      routingMode: WhatsAppRoutingMode;
      slaFirstResponseMinutes: number;
      autoReassignEnabled: boolean;
      autoReassignMinutes: number;
      agentUserIds: string[];
      botEnabled: boolean;
      aiAutoReply: boolean;
    }>,
  ): Promise<WhatsAppInboxSettingsRecord> {
    await this.ensureSettings(companyId);
    const row = await this.prisma.whatsAppInboxSettings.update({
      where: { companyId },
      data: {
        ...(patch.routingMode
          ? { routingMode: patch.routingMode as PrismaRoutingMode }
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

  async listRules(companyId: string): Promise<WhatsAppRoutingRuleRecord[]> {
    const rows = await this.prisma.whatsAppRoutingRule.findMany({
      where: { companyId },
      orderBy: { priority: 'asc' },
    });
    return rows.map((row) => this.toRule(row));
  }

  async replaceRules(
    companyId: string,
    rules: Array<{
      matchLabel?: string | null;
      matchStageId?: string | null;
      matchSource?: string | null;
      targetUserGroupId?: string | null;
      targetUserId?: string | null;
      priority?: number;
    }>,
  ): Promise<WhatsAppRoutingRuleRecord[]> {
    await this.prisma.whatsAppRoutingRule.deleteMany({ where: { companyId } });
    if (rules.length === 0) return [];
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

  async inboxCounts(
    companyId: string,
    userId: string,
  ): Promise<WhatsAppInboxCounts> {
    const settings = await this.getSettings(companyId);
    const [open, mine, unassigned, waiting, closed, waitingRows] =
      await Promise.all([
        this.prisma.whatsAppConversation.count({
          where: { status: WhatsAppConversationStatus.OPEN },
        }),
        this.prisma.whatsAppConversation.count({
          where: {
            assignedUserId: userId,
            status: { not: WhatsAppConversationStatus.RESOLVED },
          },
        }),
        this.prisma.whatsAppConversation.count({
          where: {
            assignedUserId: null,
            status: { not: WhatsAppConversationStatus.RESOLVED },
          },
        }),
        this.prisma.whatsAppConversation.count({
          where: { status: WhatsAppConversationStatus.PENDING },
        }),
        this.prisma.whatsAppConversation.count({
          where: { status: WhatsAppConversationStatus.RESOLVED },
        }),
        this.prisma.whatsAppConversation.findMany({
          where: {
            queuedAt: { not: null },
            status: { not: WhatsAppConversationStatus.RESOLVED },
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
      if (
        !row.queuedAt ||
        (row.lastAgentReplyAt && row.lastAgentReplyAt >= row.queuedAt)
      ) {
        return false;
      }
      return Date.now() - row.queuedAt.getTime() > slaMs;
    }).length;

    return { open, mine, unassigned, waiting, closed, slaBreached };
  }

  async attachLeads(
    conversations: WhatsAppConversationSummary[],
    companyId = DEFAULT_COMPANY,
  ): Promise<WhatsAppConversationSummary[]> {
    if (conversations.length === 0) return conversations;
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
    const byPhone = new Map<string, LinkedLead>();
    for (const lead of leads) {
      const phone = normalizeWhatsAppPhone(lead.phone ?? '');
      if (!phone || byPhone.has(phone)) continue;
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
      lead: byPhone.get(normalizeWhatsAppPhone(item.phone)) ?? null,
    }));
  }

  async assignIncoming(
    conversation: WhatsAppConversationSummary,
    companyId = DEFAULT_COMPANY,
  ): Promise<void> {
    if (conversation.assignedUser) return;
    const settings = await this.getSettings(companyId);
    if (settings.routingMode === WhatsAppRoutingMode.MANUAL) return;
    const userId = await this.pickAgent(companyId, conversation);
    if (!userId) return;
    await this.messages.updateConversation(conversation.phone, {
      assignedUserId: userId,
    });
  }

  @Cron('*/1 * * * *')
  async reassignOverdue(): Promise<void> {
    const settingsRows = await this.prisma.whatsAppInboxSettings.findMany({
      where: { autoReassignEnabled: true },
    });
    if (settingsRows.length === 0) return;

    for (const settings of settingsRows) {
      const cutoff = new Date(
        Date.now() - settings.autoReassignMinutes * 60_000,
      );
      const overdue = await this.prisma.whatsAppConversation.findMany({
        where: {
          assignedUserId: { not: null },
          assignedAt: { lte: cutoff },
          queuedAt: { not: null },
          status: {
            in: [
              WhatsAppConversationStatus.OPEN,
              WhatsAppConversationStatus.PENDING,
            ],
          },
        },
      });

      for (const row of overdue) {
        if (
          row.lastAgentReplyAt &&
          row.queuedAt &&
          row.lastAgentReplyAt >= row.queuedAt
        ) {
          continue;
        }
        const summary: WhatsAppConversationSummary = {
          id: row.id,
          phone: row.phone,
          name: row.name,
          status: row.status as WhatsAppConversationSummary['status'],
          priority: row.priority as WhatsAppConversationSummary['priority'],
          labels: row.labels,
          unreadCount: row.unreadCount,
          lastMessage: row.lastMessagePreview,
          lastMessageAt: row.lastMessageAt,
          direction: null,
          lastMessageStatus: null,
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
        const [withLead] = await this.attachLeads(
          [summary],
          settings.companyId,
        );
        const nextId = await this.pickAgent(
          settings.companyId,
          withLead,
          row.assignedUserId,
        );
        if (!nextId || nextId === row.assignedUserId) continue;
        await this.messages.updateConversation(row.phone, {
          assignedUserId: nextId,
        });
        this.logger.log(
          `Reassigned WhatsApp conversation ${row.phone} -> ${nextId}`,
        );
      }
    }
  }

  private async pickAgent(
    companyId: string,
    conversation: WhatsAppConversationSummary,
    excludeUserId?: string | null,
  ): Promise<string | null> {
    const settings = await this.getSettings(companyId);
    const agents = await this.eligibleAgents(settings, excludeUserId);
    if (agents.length === 0) return null;

    if (settings.routingMode === WhatsAppRoutingMode.SPECIALTY) {
      const rules = await this.listRules(companyId);
      const matched = rules.find((rule) =>
        this.ruleMatches(rule, conversation),
      );
      if (matched?.targetUserId) {
        const direct = agents.find((agent) => agent.id === matched.targetUserId);
        if (direct) return direct.id;
      }
      if (matched?.targetUserGroupId) {
        const inGroup = agents.filter((agent) =>
          agent.groupIds.includes(matched.targetUserGroupId as string),
        );
        if (inGroup.length > 0) {
          return this.nextRoundRobin(
            companyId,
            inGroup.map((agent) => agent.id),
          );
        }
      }
    }

    if (settings.routingMode === WhatsAppRoutingMode.WORKLOAD) {
      const counts = await this.prisma.whatsAppConversation.groupBy({
        by: ['assignedUserId'],
        where: {
          assignedUserId: { in: agents.map((agent) => agent.id) },
          status: { not: WhatsAppConversationStatus.RESOLVED },
        },
        _count: { _all: true },
      });
      const countById = new Map(
        counts.map((item) => [item.assignedUserId ?? '', item._count._all]),
      );
      return [...agents].sort(
        (left, right) =>
          (countById.get(left.id) ?? 0) - (countById.get(right.id) ?? 0),
      )[0].id;
    }

    return this.nextRoundRobin(
      companyId,
      agents.map((agent) => agent.id),
    );
  }

  private ruleMatches(
    rule: WhatsAppRoutingRuleRecord,
    conversation: WhatsAppConversationSummary,
  ): boolean {
    if (rule.matchLabel && !conversation.labels.includes(rule.matchLabel)) {
      return false;
    }
    if (rule.matchStageId && conversation.lead?.stageId !== rule.matchStageId) {
      return false;
    }
    if (
      rule.matchSource &&
      conversation.lead?.source?.toLowerCase() !==
        rule.matchSource.toLowerCase()
    ) {
      return false;
    }
    return Boolean(rule.matchLabel || rule.matchStageId || rule.matchSource);
  }

  private async eligibleAgents(
    settings: WhatsAppInboxSettingsRecord,
    excludeUserId?: string | null,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        companyId: settings.companyId,
        category: UserCategory.MEMBER,
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

  private async nextRoundRobin(
    companyId: string,
    userIds: string[],
  ): Promise<string> {
    const settings = await this.ensureSettings(companyId);
    const index = settings.roundRobinIndex % userIds.length;
    const chosen = userIds[index];
    await this.prisma.whatsAppInboxSettings.update({
      where: { companyId },
      data: { roundRobinIndex: (index + 1) % userIds.length },
    });
    return chosen;
  }

  private async ensureSettings(companyId: string) {
    return this.prisma.whatsAppInboxSettings.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
    });
  }

  private toSettings(row: {
    id: string;
    companyId: string;
    routingMode: PrismaRoutingMode;
    slaFirstResponseMinutes: number;
    autoReassignEnabled: boolean;
    autoReassignMinutes: number;
    agentUserIds: string[];
    botEnabled: boolean;
    aiAutoReply: boolean;
  }): WhatsAppInboxSettingsRecord {
    return {
      id: row.id,
      companyId: row.companyId,
      routingMode: row.routingMode as WhatsAppRoutingMode,
      slaFirstResponseMinutes: row.slaFirstResponseMinutes,
      autoReassignEnabled: row.autoReassignEnabled,
      autoReassignMinutes: row.autoReassignMinutes,
      agentUserIds: row.agentUserIds,
      botEnabled: row.botEnabled,
      aiAutoReply: row.aiAutoReply,
    };
  }

  private toRule(row: {
    id: string;
    companyId: string;
    matchLabel: string | null;
    matchStageId: string | null;
    matchSource: string | null;
    targetUserGroupId: string | null;
    targetUserId: string | null;
    priority: number;
  }): WhatsAppRoutingRuleRecord {
    return { ...row };
  }
}
