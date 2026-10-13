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
  type WhatsAppDownloadedMedia,
  type WhatsAppHsmTemplate,
  type WhatsAppSendResult,
} from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageKind } from '../domain/whatsapp-message';
import { WhatsAppConfig } from './whatsapp.config';

type GraphSendResponse = {
  error?: { message?: string };
  messages?: Array<{ id: string }>;
  contacts?: Array<{ wa_id: string }>;
};

type GraphPhoneResponse = {
  error?: { message?: string };
  display_phone_number?: string;
  whatsapp_business_account?: { id?: string };
};

type GraphMediaUploadResponse = {
  error?: { message?: string };
  id?: string;
};

type GraphMediaMetaResponse = {
  error?: { message?: string };
  url?: string;
  mime_type?: string;
  file_size?: number;
};

type GraphTemplatesResponse = {
  error?: { message?: string };
  data?: Array<{
    name?: string;
    language?: string;
    status?: string;
    category?: string;
    components?: WhatsAppHsmTemplate['components'];
  }>;
};

const GRAPH_MEDIA_KINDS: Partial<Record<WhatsAppMessageKind, string>> = {
  [WhatsAppMessageKind.IMAGE]: 'image',
  [WhatsAppMessageKind.DOCUMENT]: 'document',
  [WhatsAppMessageKind.AUDIO]: 'audio',
  [WhatsAppMessageKind.VIDEO]: 'video',
  [WhatsAppMessageKind.STICKER]: 'sticker',
};

@Injectable()
export class MetaWhatsAppGraphClient extends WhatsAppGraphGateway {
  private businessPhoneCache: string | null = null;
  private wabaIdCache: string | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: WhatsAppConfig,
  ) {
    super();
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, {
      type: 'text',
      text: { preview_url: false, body },
    });
  }

  async sendMedia(
    to: string,
    kind: WhatsAppMessageKind,
    mediaId: string,
    options?: { caption?: string; filename?: string },
  ): Promise<WhatsAppSendResult> {
    const type = GRAPH_MEDIA_KINDS[kind];
    if (!type) {
      throw new BadGatewayException('Unsupported WhatsApp media type');
    }
    const payload: Record<string, unknown> = { id: mediaId };
    if (options?.caption && type !== 'audio' && type !== 'sticker') {
      payload.caption = options.caption;
    }
    if (options?.filename && type === 'document') {
      payload.filename = options.filename;
    }
    return this.sendMessage(to, { type, [type]: payload });
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, {
      type: 'location',
      location: {
        latitude,
        longitude,
        ...(name ? { name } : {}),
        ...(address ? { address } : {}),
      },
    });
  }

  async sendTemplate(
    to: string,
    name: string,
    language: string,
    bodyParameters: string[],
  ): Promise<WhatsAppSendResult> {
    return this.sendMessage(to, {
      type: 'template',
      template: {
        name,
        language: { code: language },
        ...(bodyParameters.length > 0
          ? {
              components: [
                {
                  type: 'body',
                  parameters: bodyParameters.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ],
            }
          : {}),
      },
    });
  }

  async uploadMedia(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<string> {
    this.assertConfigured();
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimeType.split(';')[0].trim());
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      filename,
    );

    try {
      const response = await firstValueFrom(
        this.http.post<GraphMediaUploadResponse>(
          this.messagesUrl().replace(/\/messages$/, '/media'),
          form,
          {
            headers: { Authorization: `Bearer ${this.config.permanentToken}` },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 60_000,
          },
        ),
      );
      const id = response.data.id;
      if (!id) {
        throw new BadGatewayException('WhatsApp media upload returned no id');
      }
      return id;
    } catch (error) {
      throw new BadGatewayException(this.readGraphError(error));
    }
  }

  async downloadMedia(mediaId: string): Promise<WhatsAppDownloadedMedia> {
    this.assertConfigured();
    const metaUrl = `https://graph.facebook.com/${this.config.graphVersion}/${mediaId}`;
    try {
      const meta = await firstValueFrom(
        this.http.get<GraphMediaMetaResponse>(metaUrl, {
          headers: { Authorization: `Bearer ${this.config.permanentToken}` },
        }),
      );
      const fileUrl = meta.data.url;
      if (!fileUrl) {
        throw new BadGatewayException('WhatsApp media URL missing');
      }
      const file = await firstValueFrom(
        this.http.get<ArrayBuffer>(fileUrl, {
          responseType: 'arraybuffer',
          maxRedirects: 5,
          headers: { Authorization: `Bearer ${this.config.permanentToken}` },
          timeout: 60_000,
        }),
      );
      const mimeType =
        meta.data.mime_type ||
        String(file.headers['content-type'] ?? 'application/octet-stream');
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
      return {
        buffer: Buffer.from(file.data),
        mimeType,
        filename: `${mediaId}.${ext}`,
      };
    } catch (error) {
      throw new BadGatewayException(this.readGraphError(error));
    }
  }

  async listTemplates(): Promise<WhatsAppHsmTemplate[]> {
    this.assertConfigured();
    const wabaId = await this.resolveWabaId();
    if (!wabaId) return [];
    try {
      const response = await firstValueFrom(
        this.http.get<GraphTemplatesResponse>(
          `https://graph.facebook.com/${this.config.graphVersion}/${wabaId}/message_templates`,
          {
            params: {
              fields: 'name,status,language,category,components',
              limit: 100,
            },
            headers: { Authorization: `Bearer ${this.config.permanentToken}` },
          },
        ),
      );
      return (response.data.data ?? [])
        .filter((row) => row.name && row.language)
        .map((row) => ({
          name: row.name as string,
          language: row.language as string,
          status: row.status ?? 'UNKNOWN',
          category: row.category ?? 'UTILITY',
          components: row.components ?? [],
        }));
    } catch (error) {
      throw new BadGatewayException(this.readGraphError(error));
    }
  }

  async getBusinessPhone(): Promise<string> {
    if (this.businessPhoneCache) {
      return this.businessPhoneCache;
    }

    this.assertConfigured();

    try {
      const response = await firstValueFrom(
        this.http.get<GraphPhoneResponse>(this.phoneUrl(), {
          params: { fields: 'display_phone_number,whatsapp_business_account' },
          headers: {
            Authorization: `Bearer ${this.config.permanentToken}`,
          },
        }),
      );

      const display = response.data.display_phone_number;
      this.businessPhoneCache = display
        ? normalizeWhatsAppPhone(display)
        : this.config.phoneNumberId;
      if (response.data.whatsapp_business_account?.id) {
        this.wabaIdCache = response.data.whatsapp_business_account.id;
      }
      return this.businessPhoneCache;
    } catch {
      return this.config.phoneNumberId;
    }
  }

  private async sendMessage(
    to: string,
    payload: Record<string, unknown>,
  ): Promise<WhatsAppSendResult> {
    this.assertConfigured();
    try {
      const response = await firstValueFrom(
        this.http.post<GraphSendResponse>(
          this.messagesUrl(),
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            ...payload,
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

  private async resolveWabaId(): Promise<string> {
    if (this.config.wabaId) return this.config.wabaId;
    if (this.wabaIdCache) return this.wabaIdCache;
    await this.getBusinessPhone();
    return this.wabaIdCache ?? '';
  }

  private messagesUrl(): string {
    return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`;
  }

  private phoneUrl(): string {
    return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}`;
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
