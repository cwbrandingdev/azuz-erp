import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { PrismaService } from '../prisma/prisma.service';

type ConversationRow = {
  id: string;
  waId: string;
  phone: string | null;
  name: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: Date;
};

type MessageRow = {
  id: string;
  conversationId: string;
  direction: string;
  type: string;
  body: string | null;
  waMessageId: string | null;
  status: string;
  createdAt: Date;
};

@Injectable()
export class WhatsappWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  verifyWebhook(mode: string, token: string, challenge: string): string {
    const verifyToken = this.configService.get<string>('WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }

    throw new UnauthorizedException('Verification failed');
  }

  async handleIncomingPayload(payload: any): Promise<void> {
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const contactName = value.contacts?.[0]?.profile?.name ?? null;

        for (const message of value.messages ?? []) {
          await this.persistInbound(message, contactName);
        }

        for (const status of value.statuses ?? []) {
          await this.persistStatus(status);
        }
      }
    }
  }

  async listConversations(companyId: string) {
    const rows = await this.prisma.whatsappConversation.findMany({
      where: { companyId },
      orderBy: { lastMessageAt: 'desc' },
    });
    return rows.map((row) => this.toConversation(row));
  }

  async createConversation(
    companyId: string,
    phone: string,
    name?: string,
  ) {
    const waId = this.normalizeRecipient(phone);
    const conversation = await this.prisma.whatsappConversation.upsert({
      where: { companyId_waId: { companyId, waId } },
      create: {
        companyId,
        waId,
        phone: waId,
        name: name?.trim() || null,
      },
      update: {
        phone: waId,
        ...(name?.trim() ? { name: name.trim() } : {}),
      },
    });
    return this.toConversation(conversation);
  }

  async listMessages(companyId: string, conversationId: string) {
    const conversation = await this.prisma.whatsappConversation.findFirst({
      where: { id: conversationId, companyId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.whatsappConversation.update({
      where: { id: conversation.id },
      data: { unreadCount: 0 },
    });

    const rows = await this.prisma.whatsappMessage.findMany({
      where: { conversationId: conversation.id, companyId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return rows.map((row) => this.toMessage(row));
  }

  async sendText(companyId: string, userId: string, to: string, body: string) {
    const phoneNumberId = this.configService
      .get<string>('WHATSAPP_PHONE_NUMBER_ID')
      ?.trim();
    const accessToken = this.configService
      .get<string>('WHATSAPP_ACCESS_TOKEN')
      ?.trim();
    const version =
      this.configService.get<string>('META_API_VERSION')?.trim() || 'v21.0';

    if (!phoneNumberId || !accessToken) {
      throw new ServiceUnavailableException(
        'WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)',
      );
    }

    const recipient = this.normalizeRecipient(to);
    const response = await fetch(
      `https://graph.facebook.com/${version.replace(/^\/+/, '')}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { preview_url: false, body },
        }),
      },
    );

    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      messages?: Array<{ id: string }>;
      contacts?: Array<{ wa_id: string }>;
    } | null;

    if (!response.ok) {
      throw new BadGatewayException(
        data?.error?.message ?? 'Failed to send WhatsApp message',
      );
    }

    const waId = data?.contacts?.[0]?.wa_id ?? recipient;
    const waMessageId = data?.messages?.[0]?.id ?? null;
    const conversation = await this.upsertConversation({
      companyId,
      waId,
      phone: waId,
      preview: body,
      inbound: false,
    });

    const message = await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conversation.id,
        companyId,
        direction: 'OUT',
        type: 'TEXT',
        body,
        waMessageId,
        status: 'SENT',
        sentByUserId: userId,
      },
    });

    return {
      conversation: this.toConversation(conversation),
      message: this.toMessage(message),
    };
  }

  private async persistInbound(message: any, contactName: string | null) {
    const from = this.normalizeRecipient(String(message?.from ?? ''));
    if (!from) return;

    const waMessageId =
      typeof message?.id === 'string' && message.id.length > 0
        ? message.id
        : null;
    if (waMessageId) {
      const existing = await this.prisma.whatsappMessage.findUnique({
        where: { waMessageId },
      });
      if (existing) return;
    }

    const companyId = await this.resolveInboundCompanyId(from);
    const body = this.extractBody(message);
    const conversation = await this.upsertConversation({
      companyId,
      waId: from,
      phone: from,
      name: contactName,
      preview: body,
      inbound: true,
    });

    await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conversation.id,
        companyId,
        direction: 'IN',
        type: String(message?.type ?? 'text').toUpperCase(),
        body,
        waMessageId,
        status: 'DELIVERED',
      },
    });
  }

  private async persistStatus(status: any) {
    const waMessageId =
      typeof status?.id === 'string' ? status.id : undefined;
    if (!waMessageId) return;

    const mapped = this.mapStatus(status?.status);
    if (!mapped) return;

    await this.prisma.whatsappMessage.updateMany({
      where: { waMessageId },
      data: {
        status: mapped,
        ...(mapped === 'FAILED'
          ? { errorMessage: status?.errors?.[0]?.title ?? 'Failed' }
          : {}),
      },
    });
  }

  private async resolveInboundCompanyId(waId: string): Promise<string> {
    const existing = await this.prisma.whatsappConversation.findFirst({
      where: { waId },
      select: { companyId: true },
    });
    return existing?.companyId ?? DEFAULT_COMPANY_ID;
  }

  private async upsertConversation(input: {
    companyId: string;
    waId: string;
    phone: string;
    name?: string | null;
    preview: string;
    inbound: boolean;
  }) {
    return this.prisma.whatsappConversation.upsert({
      where: {
        companyId_waId: { companyId: input.companyId, waId: input.waId },
      },
      create: {
        companyId: input.companyId,
        waId: input.waId,
        phone: input.phone,
        name: input.name?.trim() || null,
        lastMessageAt: new Date(),
        lastMessagePreview: input.preview.slice(0, 180),
        unreadCount: input.inbound ? 1 : 0,
      },
      update: {
        phone: input.phone,
        lastMessageAt: new Date(),
        lastMessagePreview: input.preview.slice(0, 180),
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.inbound ? { unreadCount: { increment: 1 } } : {}),
      },
    });
  }

  private extractBody(message: any): string {
    if (message?.text?.body) return String(message.text.body);
    if (message?.image?.caption) return String(message.image.caption);
    if (message?.type === 'image') return '[Imagem]';
    if (message?.type === 'audio') return '[Áudio]';
    if (message?.type === 'video') return '[Vídeo]';
    if (message?.type === 'document') return '[Documento]';
    if (message?.type === 'sticker') return '[Figurinha]';
    return `[${message?.type ?? 'mensagem'}]`;
  }

  private mapStatus(status: unknown): string | null {
    if (status === 'sent') return 'SENT';
    if (status === 'delivered') return 'DELIVERED';
    if (status === 'read') return 'READ';
    if (status === 'failed') return 'FAILED';
    return null;
  }

  normalizeRecipient(input: string): string {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
    return digits;
  }

  private toConversation(row: ConversationRow) {
    return {
      id: row.id,
      waId: row.waId,
      phone: row.phone,
      name: row.name,
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.lastMessagePreview,
      unreadCount: row.unreadCount,
      createdAt: row.createdAt,
    };
  }

  private toMessage(row: MessageRow) {
    return {
      id: row.id,
      conversationId: row.conversationId,
      direction: row.direction,
      type: row.type,
      body: row.body,
      waMessageId: row.waMessageId,
      status: row.status,
      createdAt: row.createdAt,
    };
  }
}
