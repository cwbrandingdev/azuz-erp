import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  WhatsAppConversationPriority,
  WhatsAppConversationStatus,
  WhatsAppMessageDirection,
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
import { WhatsAppDirection } from '../domain/whatsapp-message';
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
    if (filter.status) {
      where.status = filter.status as WhatsAppConversationStatus;
    }
    if (filter.assignee === 'mine' && filter.userId) {
      where.assignedUserId = filter.userId;
    }
    if (filter.assignee === 'unassigned') {
      where.assignedUserId = null;
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
      orderBy: { lastMessageAt: 'desc' },
    });
    return rows.map((row) => this.toConversation(row));
  }

  async getConversation(
    phone: string,
  ): Promise<WhatsAppConversationSummary | null> {
    const row = await this.prisma.whatsAppConversation.findUnique({
      where: { phone },
      include: { assignedUser: { select: assignedUserSelect } },
    });
    return row ? this.toConversation(row) : null;
  }

  async upsertConversation(input: {
    phone: string;
    name?: string | null;
    preview: string;
    inbound: boolean;
    reopen?: boolean;
  }): Promise<WhatsAppConversationSummary> {
    const row = await this.prisma.whatsAppConversation.upsert({
      where: { phone: input.phone },
      create: {
        phone: input.phone,
        name: input.name?.trim() || null,
        lastMessageAt: new Date(),
        lastMessagePreview: input.preview.slice(0, 180),
        unreadCount: input.inbound ? 1 : 0,
        status: WhatsAppConversationStatus.OPEN,
      },
      update: {
        lastMessageAt: new Date(),
        lastMessagePreview: input.preview.slice(0, 180),
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.inbound ? { unreadCount: { increment: 1 } } : {}),
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
        ...(patch.status
          ? { status: patch.status as WhatsAppConversationStatus }
          : {}),
        ...(patch.priority
          ? { priority: patch.priority as WhatsAppConversationPriority }
          : {}),
        ...(patch.assignedUserId !== undefined
          ? { assignedUserId: patch.assignedUserId }
          : {}),
        ...(patch.labels ? { labels: patch.labels } : {}),
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
    await this.prisma.whatsAppMessage.updateMany({
      where: { whatsappMessageId },
      data: { status: status as WhatsAppMessageStatus },
    });
  }

  async listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]> {
    return this.prisma.whatsAppCannedResponse.findMany({
      orderBy: { shortCode: 'asc' },
    });
  }

  async createCannedResponse(input: {
    shortCode: string;
    title: string;
    content: string;
  }): Promise<WhatsAppCannedResponseRecord> {
    return this.prisma.whatsAppCannedResponse.create({
      data: {
        shortCode: input.shortCode.replace(/^\//, '').trim().toLowerCase(),
        title: input.title.trim(),
        content: input.content.trim(),
      },
    });
  }

  async deleteCannedResponse(id: string): Promise<void> {
    await this.prisma.whatsAppCannedResponse.delete({ where: { id } });
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

  private toMessage(row: {
    id: string;
    whatsappMessageId: string | null;
    fromPhone: string;
    toPhone: string;
    body: string;
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
      direction: row.direction as WhatsAppDirection,
      status: row.status as WhatsAppStatus,
      isPrivate: row.isPrivate,
      sentByUserId: row.sentByUserId,
      sentByName: row.sentBy?.name ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toConversation(row: {
    id: string;
    phone: string;
    name: string | null;
    status: WhatsAppConversationStatus;
    priority: WhatsAppConversationPriority;
    labels: string[];
    unreadCount: number;
    lastMessagePreview: string | null;
    lastMessageAt: Date;
    assignedUser: WhatsAppAssignedUser | null;
  }): WhatsAppConversationSummary {
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
      direction: null,
      assignedUser: row.assignedUser,
    };
  }
}
