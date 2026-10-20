import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  WhatsAppConversationPriority,
  WhatsAppConversationStatus,
  WhatsAppMessageDirection,
  WhatsAppMessageKind as PrismaMessageKind,
  WhatsAppMessageStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ConversationListFilter,
  ConversationPatch,
  WhatsAppAssignedUser,
  WhatsAppCannedResponseRecord,
  WhatsAppConversationSummary,
  WhatsAppInboxPriority,
  WhatsAppInboxStatus,
  WhatsAppMessageRecord,
  WhatsAppStatus,
} from '../domain/whatsapp-message';
import {
  WhatsAppDirection,
  WhatsAppMessageKind,
} from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';

const assignedUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PrismaWhatsAppMessageRepository extends WhatsAppMessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    data: Omit<
      WhatsAppMessageRecord,
      'id' | 'createdAt' | 'updatedAt' | 'sentByName'
    > & { conversationId?: string | null },
  ): Promise<WhatsAppMessageRecord> {
    const row = await this.prisma.whatsAppMessage.create({
      data: {
        whatsappMessageId: data.whatsappMessageId,
        fromPhone: data.fromPhone,
        toPhone: data.toPhone,
        body: data.body,
        kind: (data.kind ?? WhatsAppMessageKind.TEXT) as PrismaMessageKind,
        mediaUrl: data.mediaUrl ?? null,
        mediaMimeType: data.mediaMimeType ?? null,
        mediaFilename: data.mediaFilename ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        locationName: data.locationName ?? null,
        locationAddress: data.locationAddress ?? null,
        isViewOnce: data.isViewOnce ?? false,
        isVoiceNote: data.isVoiceNote ?? false,
        transcription: data.transcription ?? null,
        templateName: data.templateName ?? null,
        templateLanguage: data.templateLanguage ?? null,
        direction: data.direction as WhatsAppMessageDirection,
        status: data.status as WhatsAppMessageStatus,
        isPrivate: data.isPrivate,
        sentByUserId: data.sentByUserId,
        conversationId: data.conversationId,
      },
      include: {
        sentBy: { select: { name: true } },
      },
    });
    return this.toMessage(row);
  }

  async findByWhatsappMessageId(
    whatsappMessageId: string,
  ): Promise<WhatsAppMessageRecord | null> {
    const row = await this.prisma.whatsAppMessage.findUnique({
      where: { whatsappMessageId },
      include: { sentBy: { select: { name: true } } },
    });
    return row ? this.toMessage(row) : null;
  }

  async findConversation(phone: string): Promise<WhatsAppMessageRecord[]> {
    const rows = await this.prisma.whatsAppMessage.findMany({
      where: {
        OR: [{ fromPhone: phone }, { toPhone: phone }],
      },
      include: { sentBy: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toMessage(row));
  }

  async listConversations(
    filter: ConversationListFilter,
  ): Promise<WhatsAppConversationSummary[]> {
    await this.backfillConversations();

    const where: Prisma.WhatsAppConversationWhereInput = {};
    const tab = filter.tab;
    if (tab === 'OPEN') {
      where.status = WhatsAppConversationStatus.OPEN;
    } else if (tab === 'WAITING') {
      where.status = WhatsAppConversationStatus.PENDING;
    } else if (tab === 'CLOSED') {
      where.status = WhatsAppConversationStatus.RESOLVED;
    } else if (tab === 'MINE' && filter.userId) {
      where.assignedUserId = filter.userId;
      where.status = { not: WhatsAppConversationStatus.RESOLVED };
    } else if (tab === 'UNASSIGNED') {
      where.assignedUserId = null;
      where.status = { not: WhatsAppConversationStatus.RESOLVED };
    } else if (filter.status) {
      where.status = filter.status as WhatsAppConversationStatus;
    }

    if (!tab) {
      if (filter.assignee === 'mine' && filter.userId) {
        where.assignedUserId = filter.userId;
      }
      if (filter.assignee === 'unassigned') {
        where.assignedUserId = null;
      }
    }

    if (filter.operatorId) {
      where.assignedUserId = filter.operatorId;
    }
    if (filter.label?.trim()) {
      where.labels = { has: filter.label.trim() };
    }
    if (filter.query?.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { phone: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { lastMessagePreview: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.whatsAppConversation.findMany({
      where,
      include: { assignedUser: { select: assignedUserSelect } },
      orderBy:
        tab === 'UNASSIGNED'
          ? [
              { queuedAt: { sort: 'asc', nulls: 'last' } },
              { lastMessageAt: 'desc' },
            ]
          : { lastMessageAt: 'desc' },
    });
    return rows.map((row) => this.toConversation(row, filter.slaMinutes ?? 5));
  }

  async getConversation(
    phone: string,
    slaMinutes = 5,
  ): Promise<WhatsAppConversationSummary | null> {
    const row = await this.prisma.whatsAppConversation.findUnique({
      where: { phone },
      include: { assignedUser: { select: assignedUserSelect } },
    });
    return row ? this.toConversation(row, slaMinutes) : null;
  }

  async upsertConversation(input: {
    phone: string;
    name?: string | null;
    preview: string;
    inbound: boolean;
    reopen?: boolean;
    agentReply?: boolean;
  }): Promise<WhatsAppConversationSummary> {
    const now = new Date();
    const existing = await this.prisma.whatsAppConversation.findUnique({
      where: { phone: input.phone },
    });
    const queuedAt = existing?.queuedAt ?? null;
    const lastAgentReplyAt = existing?.lastAgentReplyAt ?? null;
    const stillWaiting = Boolean(
      queuedAt && (!lastAgentReplyAt || lastAgentReplyAt < queuedAt),
    );

    const lastMessageDirection = input.inbound
      ? WhatsAppMessageDirection.INBOUND
      : WhatsAppMessageDirection.OUTBOUND;
    const lastMessageStatus = input.inbound
      ? null
      : WhatsAppMessageStatus.SENT;

    const row = await this.prisma.whatsAppConversation.upsert({
      where: { phone: input.phone },
      create: {
        phone: input.phone,
        name: input.name?.trim() || null,
        lastMessageAt: now,
        lastMessagePreview: input.preview.slice(0, 180),
        lastMessageDirection,
        lastMessageStatus,
        unreadCount: input.inbound ? 1 : 0,
        status: input.agentReply
          ? WhatsAppConversationStatus.PENDING
          : WhatsAppConversationStatus.OPEN,
        queuedAt: input.inbound ? now : null,
        lastCustomerMessageAt: input.inbound ? now : null,
        lastAgentReplyAt: input.agentReply ? now : null,
      },
      update: {
        lastMessageAt: now,
        lastMessagePreview: input.preview.slice(0, 180),
        lastMessageDirection,
        lastMessageStatus,
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.inbound
          ? {
              unreadCount: { increment: 1 },
              lastCustomerMessageAt: now,
              queuedAt: stillWaiting ? queuedAt : now,
            }
          : {}),
        ...(input.agentReply
          ? {
              lastAgentReplyAt: now,
              queuedAt: null,
              status:
                existing?.status === WhatsAppConversationStatus.RESOLVED ||
                existing?.status === WhatsAppConversationStatus.SNOOZED
                  ? existing.status
                  : WhatsAppConversationStatus.PENDING,
            }
          : {}),
        ...(input.reopen ? { status: WhatsAppConversationStatus.OPEN } : {}),
      },
      include: { assignedUser: { select: assignedUserSelect } },
    });
    return this.toConversation(row);
  }

  async updateConversation(
    phone: string,
    patch: ConversationPatch,
  ): Promise<WhatsAppConversationSummary> {
    const existing = await this.prisma.whatsAppConversation.findUnique({
      where: { phone },
    });
    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }

    const row = await this.prisma.whatsAppConversation.update({
      where: { phone },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined
          ? {
              status: patch.status as WhatsAppConversationStatus,
              ...(patch.status === WhatsAppConversationStatus.RESOLVED
                ? { queuedAt: null }
                : {}),
              ...(existing.status === WhatsAppConversationStatus.RESOLVED &&
              (patch.status === WhatsAppConversationStatus.OPEN ||
                patch.status === WhatsAppConversationStatus.PENDING)
                ? { queuedAt: null }
                : {}),
            }
          : {}),
        ...(patch.priority !== undefined
          ? { priority: patch.priority as WhatsAppConversationPriority }
          : {}),
        ...(patch.assignedUserId !== undefined
          ? {
              assignedUserId: patch.assignedUserId,
              assignedAt: patch.assignedUserId ? new Date() : null,
            }
          : {}),
        ...(patch.labels ? { labels: patch.labels } : {}),
        ...(patch.queuedAt !== undefined ? { queuedAt: patch.queuedAt } : {}),
        ...(patch.assignedAt !== undefined
          ? { assignedAt: patch.assignedAt }
          : {}),
        ...(patch.lastAgentReplyAt !== undefined
          ? { lastAgentReplyAt: patch.lastAgentReplyAt }
          : {}),
        ...(patch.lastCustomerMessageAt !== undefined
          ? { lastCustomerMessageAt: patch.lastCustomerMessageAt }
          : {}),
      },
      include: { assignedUser: { select: assignedUserSelect } },
    });
    return this.toConversation(row);
  }

  async markConversationRead(phone: string): Promise<void> {
    await this.prisma.whatsAppConversation.updateMany({
      where: { phone },
      data: { unreadCount: 0 },
    });
  }

  async updateStatusByWhatsappMessageId(
    whatsappMessageId: string,
    status: WhatsAppStatus,
  ): Promise<void> {
    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { whatsappMessageId },
      select: { id: true, conversationId: true, createdAt: true, direction: true },
    });
    if (!message) {
      return;
    }
    await this.prisma.whatsAppMessage.updateMany({
      where: { whatsappMessageId },
      data: { status: status as WhatsAppMessageStatus },
    });
    if (!message.conversationId) {
      return;
    }
    const latest = await this.prisma.whatsAppMessage.findFirst({
      where: { conversationId: message.conversationId, isPrivate: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (latest?.id !== message.id) {
      return;
    }
    await this.prisma.whatsAppConversation.update({
      where: { id: message.conversationId },
      data: {
        lastMessageStatus: status as WhatsAppMessageStatus,
        lastMessageDirection: message.direction,
      },
    });
  }

  async listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]> {
    const rows = await this.prisma.whatsAppCannedResponse.findMany({
      orderBy: { shortCode: 'asc' },
    });
    return rows.map((row) => this.toCanned(row));
  }

  async createCannedResponse(input: {
    shortCode: string;
    title: string;
    content: string;
    kind?: WhatsAppMessageKind;
    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaFilename?: string | null;
  }): Promise<WhatsAppCannedResponseRecord> {
    const row = await this.prisma.whatsAppCannedResponse.create({
      data: {
        shortCode: input.shortCode.replace(/^\//, '').trim().toLowerCase(),
        title: input.title.trim(),
        content: input.content.trim() || (input.mediaUrl ? '[Mídia]' : ''),
        kind: (input.kind ?? WhatsAppMessageKind.TEXT) as PrismaMessageKind,
        mediaUrl: input.mediaUrl ?? null,
        mediaMimeType: input.mediaMimeType ?? null,
        mediaFilename: input.mediaFilename ?? null,
      },
    });
    return this.toCanned(row);
  }

  async deleteCannedResponse(id: string): Promise<void> {
    await this.prisma.whatsAppCannedResponse.delete({ where: { id } });
  }

  async updateMessage(
    id: string,
    patch: Partial<
      Pick<WhatsAppMessageRecord, 'transcription' | 'mediaUrl' | 'mediaMimeType'>
    >,
  ): Promise<void> {
    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: {
        ...(patch.transcription !== undefined
          ? { transcription: patch.transcription }
          : {}),
        ...(patch.mediaUrl !== undefined ? { mediaUrl: patch.mediaUrl } : {}),
        ...(patch.mediaMimeType !== undefined
          ? { mediaMimeType: patch.mediaMimeType }
          : {}),
      },
    });
  }

  private async backfillConversations(): Promise<void> {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { isPrivate: false },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    for (const row of messages) {
      const phone =
        row.direction === WhatsAppMessageDirection.OUTBOUND
          ? row.toPhone
          : row.fromPhone;
      if (seen.has(phone)) continue;
      seen.add(phone);
      await this.prisma.whatsAppConversation.upsert({
        where: { phone },
        create: {
          phone,
          lastMessageAt: row.createdAt,
          lastMessagePreview: row.body.slice(0, 180),
        },
        update: {},
      });
    }
  }

  private toCanned(row: {
    id: string;
    shortCode: string;
    title: string;
    content: string;
    kind: PrismaMessageKind;
    mediaUrl: string | null;
    mediaMimeType: string | null;
    mediaFilename: string | null;
  }): WhatsAppCannedResponseRecord {
    return {
      id: row.id,
      shortCode: row.shortCode,
      title: row.title,
      content: row.content,
      kind: row.kind as WhatsAppMessageKind,
      mediaUrl: row.mediaUrl,
      mediaMimeType: row.mediaMimeType,
      mediaFilename: row.mediaFilename,
    };
  }

  private toMessage(row: {
    id: string;
    whatsappMessageId: string | null;
    fromPhone: string;
    toPhone: string;
    body: string;
    kind?: PrismaMessageKind;
    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaFilename?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    locationAddress?: string | null;
    isViewOnce?: boolean;
    isVoiceNote?: boolean;
    transcription?: string | null;
    templateName?: string | null;
    templateLanguage?: string | null;
    direction: WhatsAppMessageDirection;
    status: WhatsAppMessageStatus;
    isPrivate: boolean;
    sentByUserId: string | null;
    sentBy?: { name: string } | null;
    createdAt: Date;
    updatedAt: Date;
  }): WhatsAppMessageRecord {
    return {
      id: row.id,
      whatsappMessageId: row.whatsappMessageId,
      fromPhone: row.fromPhone,
      toPhone: row.toPhone,
      body: row.body,
      kind: (row.kind ?? 'TEXT') as WhatsAppMessageKind,
      mediaUrl: row.mediaUrl ?? null,
      mediaMimeType: row.mediaMimeType ?? null,
      mediaFilename: row.mediaFilename ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      locationName: row.locationName ?? null,
      locationAddress: row.locationAddress ?? null,
      isViewOnce: row.isViewOnce ?? false,
      isVoiceNote: row.isVoiceNote ?? false,
      transcription: row.transcription ?? null,
      templateName: row.templateName ?? null,
      templateLanguage: row.templateLanguage ?? null,
      direction: row.direction as WhatsAppDirection,
      status: row.status as WhatsAppStatus,
      isPrivate: row.isPrivate,
      sentByUserId: row.sentByUserId,
      sentByName: row.sentBy?.name ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toConversation(
    row: {
      id: string;
      phone: string;
      name: string | null;
      status: WhatsAppConversationStatus;
      priority: WhatsAppConversationPriority;
      labels: string[];
      unreadCount: number;
      lastMessagePreview: string | null;
      lastMessageAt: Date;
      lastMessageDirection?: WhatsAppMessageDirection | null;
      lastMessageStatus?: WhatsAppMessageStatus | null;
      queuedAt?: Date | null;
      assignedAt?: Date | null;
      lastAgentReplyAt?: Date | null;
      assignedUser: WhatsAppAssignedUser | null;
    },
    slaMinutes = 5,
  ): WhatsAppConversationSummary {
    const queuedAt = row.queuedAt ?? null;
    const assignedAt = row.assignedAt ?? null;
    const lastAgentReplyAt = row.lastAgentReplyAt ?? null;
    const needsAgentReply = Boolean(
      row.status !== WhatsAppConversationStatus.RESOLVED &&
        queuedAt &&
        (!lastAgentReplyAt || lastAgentReplyAt < queuedAt),
    );
    const waitingSeconds =
      needsAgentReply && queuedAt
        ? Math.max(0, Math.round((Date.now() - queuedAt.getTime()) / 1000))
        : 0;
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      status: row.status as WhatsAppInboxStatus,
      priority: row.priority as WhatsAppInboxPriority,
      labels: row.labels,
      unreadCount: row.unreadCount,
      lastMessage: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      direction: row.lastMessageDirection
        ? (row.lastMessageDirection as WhatsAppDirection)
        : null,
      lastMessageStatus: row.lastMessageStatus
        ? (row.lastMessageStatus as WhatsAppStatus)
        : null,
      assignedUser: row.assignedUser,
      queuedAt,
      assignedAt,
      lastAgentReplyAt,
      waitingSeconds,
      slaBreached: waitingSeconds > slaMinutes * 60,
      needsAgentReply,
      lead: null,
    };
  }
}
