import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappWebhookService {
  constructor(private readonly configService: ConfigService) {}

  verifyWebhook(mode: string, token: string, challenge: string): string {
    const verifyToken = this.configService.get<string>('WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }

    throw new UnauthorizedException('Verification failed');
  }

  handleIncomingPayload(payload: any): void {
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
      const message = value.messages[0];
      const from = message.from;
      const text = message.text?.body;

      this.processMessage(from, text);
    }

    if (value?.statuses) {
      const status = value.statuses[0];
      const messageId = status.id;
      const statusType = status.status;

      this.processStatus(messageId, statusType);
    }
  }

  async sendText(to: string, body: string) {
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

    return {
      id: data?.messages?.[0]?.id ?? null,
      to: data?.contacts?.[0]?.wa_id ?? recipient,
    };
  }

  private normalizeRecipient(input: string): string {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
    return digits;
  }

  private processMessage(from: string, text: string): void {}

  private processStatus(messageId: string, status: string): void {}
}
