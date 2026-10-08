import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  extractInboundText,
  mapMetaStatus,
  WhatsAppDirection,
  WhatsAppStatus,
  type ConversationListFilter,
  type ConversationPatch,
  type WhatsAppCannedResponseRecord,
  type WhatsAppConversationSummary,
  type WhatsAppMessageRecord,
} from '../domain/whatsapp-message';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          image?: { caption?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
        }>;
      };
    }>;
  }>;
};

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly messages: WhatsAppMessageRepository,
    private readonly graph: WhatsAppGraphGateway,
    private readonly config: WhatsAppConfig,
  ) {}

  verifyWebhook(mode: string, token: string, challenge: string): string {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return challenge;
    }
    throw new UnauthorizedException('Verification failed');
  }

  async handleWebhook(payload: MetaWebhookPayload): Promise<void> {
    const entries = payload.entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;
        const contactName = value.contacts?.[0]?.profile?.name ?? null;

        for (const inbound of value.messages ?? []) {
          await this.persistInbound(inbound, contactName);
        }

        for (const status of value.statuses ?? []) {
          await this.persistStatus(status);
        }
      }
    }
  }

  async send(
    to: string,
    message: string,
    userId?: string,
  ): Promise<WhatsAppMessageRecord> {
    const recipient = normalizeWhatsAppPhone(to);
    const businessPhone = await this.graph.getBusinessPhone();
    const result = await this.graph.sendText(recipient, message);
    const conversation = await this.messages.upsertConversation({
      phone: recipient,
      preview: message,
      inbound: false,
    });

    return this.messages.create({
      whatsappMessageId: result.whatsappMessageId,
      fromPhone: businessPhone,
      toPhone: result.to,
      body: message,
      direction: WhatsAppDirection.OUTBOUND,
      status: WhatsAppStatus.SENT,
      isPrivate: false,
      sentByUserId: userId ?? null,
      conversationId: conversation.id,
    });
  }

  async addPrivateNote(
    phone: string,
    body: string,
    userId: string,
  ): Promise<WhatsAppMessageRecord> {
    const recipient = normalizeWhatsAppPhone(phone);
    const businessPhone = await this.graph.getBusinessPhone();
    const conversation = await this.messages.upsertConversation({
      phone: recipient,
      preview: body,
      inbound: false,
    });

    return this.messages.create({
      whatsappMessageId: null,
      fromPhone: businessPhone,
      toPhone: recipient,
      body,
      direction: WhatsAppDirection.OUTBOUND,
      status: WhatsAppStatus.SENT,
      isPrivate: true,
      sentByUserId: userId,
      conversationId: conversation.id,
    });
  }

  async listByPhone(phone: string): Promise<WhatsAppMessageRecord[]> {
    const normalized = normalizeWhatsAppPhone(phone);
    await this.messages.markConversationRead(normalized);
    return this.messages.findConversation(normalized);
  }

  async listConversations(
    filter: ConversationListFilter,
  ): Promise<WhatsAppConversationSummary[]> {
    return this.messages.listConversations(filter);
  }

  async getConversation(phone: string): Promise<WhatsAppConversationSummary | null> {
    return this.messages.getConversation(normalizeWhatsAppPhone(phone));
  }

  async updateConversation(phone: string, patch: ConversationPatch) {
    return this.messages.updateConversation(
      normalizeWhatsAppPhone(phone),
      patch,
    );
  }

  listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]> {
    return this.messages.listCannedResponses();
  }

  createCannedResponse(input: {
    shortCode: string;
    title: string;
    content: string;
  }): Promise<WhatsAppCannedResponseRecord> {
    return this.messages.createCannedResponse(input);
  }

  deleteCannedResponse(id: string): Promise<void> {
    return this.messages.deleteCannedResponse(id);
  }

  private async persistInbound(
    message: {
      id?: string;
      from?: string;
      type?: string;
      text?: { body?: string };
      image?: { caption?: string };
    },
    contactName: string | null,
  ): Promise<void> {
    const body = extractInboundText(message);
    const from = message.from ? normalizeWhatsAppPhone(message.from) : '';
    if (!body || !from) {
      return;
    }

    if (message.id) {
      const existing = await this.messages.findByWhatsappMessageId(message.id);
      if (existing) {
        return;
      }
    }

    const businessPhone = await this.graph.getBusinessPhone();
    const conversation = await this.messages.upsertConversation({
      phone: from,
      name: contactName,
      preview: body,
      inbound: true,
      reopen: true,
    });

    await this.messages.create({
      whatsappMessageId: message.id ?? null,
      fromPhone: from,
      toPhone: businessPhone,
      body,
      direction: WhatsAppDirection.INBOUND,
      status: WhatsAppStatus.DELIVERED,
      isPrivate: false,
      sentByUserId: null,
      conversationId: conversation.id,
    });
  }

  private async persistStatus(status: {
    id?: string;
    status?: string;
  }): Promise<void> {
    if (!status.id) {
      return;
    }
    const mapped = mapMetaStatus(status.status);
    if (!mapped) {
      return;
    }
    await this.messages.updateStatusByWhatsappMessageId(status.id, mapped);
  }
}
