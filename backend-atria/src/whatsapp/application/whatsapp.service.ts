import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  extractInboundText,
  mapMetaStatus,
  WhatsAppDirection,
  WhatsAppStatus,
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

        for (const inbound of value.messages ?? []) {
          await this.persistInbound(inbound);
        }

        for (const status of value.statuses ?? []) {
          await this.persistStatus(status);
        }
      }
    }
  }

  async send(to: string, message: string): Promise<WhatsAppMessageRecord> {
    const recipient = normalizeWhatsAppPhone(to);
    const businessPhone = await this.graph.getBusinessPhone();
    const result = await this.graph.sendText(recipient, message);

    return this.messages.create({
      whatsappMessageId: result.whatsappMessageId,
      fromPhone: businessPhone,
      toPhone: result.to,
      body: message,
      direction: WhatsAppDirection.OUTBOUND,
      status: WhatsAppStatus.SENT,
    });
  }

  async listByPhone(phone: string): Promise<WhatsAppMessageRecord[]> {
    return this.messages.findConversation(normalizeWhatsAppPhone(phone));
  }

  async listConversations(): Promise<WhatsAppConversationSummary[]> {
    return this.messages.listConversations();
  }

  private async persistInbound(message: {
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
    image?: { caption?: string };
  }): Promise<void> {
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
    await this.messages.create({
      whatsappMessageId: message.id ?? null,
      fromPhone: from,
      toPhone: businessPhone,
      body,
      direction: WhatsAppDirection.INBOUND,
      status: WhatsAppStatus.DELIVERED,
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
