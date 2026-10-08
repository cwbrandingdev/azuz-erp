import { Injectable } from '@nestjs/common';
import {
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  WhatsAppConversationSummary,
  WhatsAppMessageRecord,
  WhatsAppStatus,
} from '../domain/whatsapp-message';
import { WhatsAppDirection } from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';

@Injectable()
export class PrismaWhatsAppMessageRepository extends WhatsAppMessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    data: Omit<WhatsAppMessageRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WhatsAppMessageRecord> {
    const row = await this.prisma.whatsAppMessage.create({
      data: {
        whatsappMessageId: data.whatsappMessageId,
        fromPhone: data.fromPhone,
        toPhone: data.toPhone,
        body: data.body,
        direction: data.direction as WhatsAppMessageDirection,
        status: data.status as WhatsAppMessageStatus,
      },
    });
    return this.toRecord(row);
  }

  async findByWhatsappMessageId(
    whatsappMessageId: string,
  ): Promise<WhatsAppMessageRecord | null> {
    const row = await this.prisma.whatsAppMessage.findUnique({
      where: { whatsappMessageId },
    });
    return row ? this.toRecord(row) : null;
  }

  async findConversation(phone: string): Promise<WhatsAppMessageRecord[]> {
    const rows = await this.prisma.whatsAppMessage.findMany({
      where: {
        OR: [{ fromPhone: phone }, { toPhone: phone }],
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async listConversations(): Promise<WhatsAppConversationSummary[]> {
    const rows = await this.prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const seen = new Set<string>();
    const conversations: WhatsAppConversationSummary[] = [];

    for (const row of rows) {
      const phone =
        row.direction === WhatsAppMessageDirection.OUTBOUND
          ? row.toPhone
          : row.fromPhone;
      if (seen.has(phone)) continue;
      seen.add(phone);
      conversations.push({
        phone,
        lastMessage: row.body,
        lastMessageAt: row.createdAt,
        direction: row.direction as WhatsAppDirection,
      });
    }

    return conversations;
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

  private toRecord(row: {
    id: string;
    whatsappMessageId: string | null;
    fromPhone: string;
    toPhone: string;
    body: string;
    direction: WhatsAppMessageDirection;
    status: WhatsAppMessageStatus;
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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
