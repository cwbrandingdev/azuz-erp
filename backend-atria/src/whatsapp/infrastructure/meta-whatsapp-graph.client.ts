import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import {
  WhatsAppGraphGateway,
  type WhatsAppSendTextResult,
} from '../domain/whatsapp-graph.gateway';
import { WhatsAppConfig } from './whatsapp.config';

type GraphSendResponse = {
  error?: { message?: string };
  messages?: Array<{ id: string }>;
  contacts?: Array<{ wa_id: string }>;
};

type GraphPhoneResponse = {
  error?: { message?: string };
  display_phone_number?: string;
};

@Injectable()
export class MetaWhatsAppGraphClient extends WhatsAppGraphGateway {
  private businessPhoneCache: string | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: WhatsAppConfig,
  ) {
    super();
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendTextResult> {
    this.assertConfigured();

    const url = `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`;

    try {
      const response = await firstValueFrom(
        this.http.post<GraphSendResponse>(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body },
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.permanentToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      return {
        whatsappMessageId: data.messages?.[0]?.id ?? null,
        to: data.contacts?.[0]?.wa_id ?? to,
      };
    } catch (error) {
      throw new BadGatewayException(this.readGraphError(error));
    }
  }

  async getBusinessPhone(): Promise<string> {
    if (this.businessPhoneCache) {
      return this.businessPhoneCache;
    }

    this.assertConfigured();

    const url = `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}`;

    try {
      const response = await firstValueFrom(
        this.http.get<GraphPhoneResponse>(url, {
          params: { fields: 'display_phone_number' },
          headers: {
            Authorization: `Bearer ${this.config.permanentToken}`,
          },
        }),
      );

      const display = response.data.display_phone_number;
      this.businessPhoneCache = display
        ? normalizeWhatsAppPhone(display)
        : this.config.phoneNumberId;
      return this.businessPhoneCache;
    } catch {
      return this.config.phoneNumberId;
    }
  }

  private assertConfigured(): void {
    if (!this.config.isConfigured) {
      throw new ServiceUnavailableException(
        'WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_PERMANENT_TOKEN)',
      );
    }
  }

  private readGraphError(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response
    ) {
      const data = error.response.data as GraphSendResponse;
      if (data.error?.message) {
        return data.error.message;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Failed to send WhatsApp message';
  }
}
