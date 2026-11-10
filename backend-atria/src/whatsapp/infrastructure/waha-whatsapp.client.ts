import { randomUUID } from 'crypto';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  WhatsAppGraphGateway,
  type WhatsAppDownloadedMedia,
  type WhatsAppInteractiveOption,
  type WhatsAppSendResult,
  type WhatsAppSessionInfo,
} from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageKind } from '../domain/whatsapp-message';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import { WhatsAppConfig } from './whatsapp.config';

type WahaSendResponse = {
  id?: string;
  key?: { id?: string };
};

type WahaMe = {
  id?: string;
  pushName?: string;
};

type WahaWebhookConfig = {
  url?: string;
  events?: string[];
};

type WahaSession = {
  name?: string;
  status?: string;
  me?: WahaMe | null;
  config?: {
    webhooks?: WahaWebhookConfig[];
  };
};

type PendingMedia = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

const WEBHOOK_EVENTS = [
  'message',
  'message.any',
  'message.ack',
  'session.status',
];

@Injectable()
export class WahaWhatsAppClient extends WhatsAppGraphGateway {
  private readonly logger = new Logger(WahaWhatsAppClient.name);
  private readonly pendingMedia = new Map<string, PendingMedia>();
  private businessPhoneCache: string | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: WhatsAppConfig,
  ) {
    super();
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    const data = await this.post<WahaSendResponse>('/api/sendText', {
      session: this.config.session,
      chatId: this.chatId(to),
      text: body,
    });
    return this.sendResult(to, data);
  }

  async sendInteractiveMenu(
    to: string,
    bodyText: string,
    options: WhatsAppInteractiveOption[],
  ): Promise<WhatsAppSendResult> {
    const lines = options
      .filter((item) => item.id.trim() && item.title.trim())
      .map((item) => `${item.id.trim()}. ${item.title.trim()}`);
    const text = lines.length > 0 ? `${bodyText}\n${lines.join('\n')}` : bodyText;
    return this.sendText(to, text);
  }

  async uploadMedia(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<string> {
    const id = randomUUID();
    this.pendingMedia.set(id, { buffer, mimeType, filename });
    return id;
  }

  async sendMedia(
    to: string,
    kind: WhatsAppMessageKind,
    mediaId: string,
    options?: { caption?: string; filename?: string },
  ): Promise<WhatsAppSendResult> {
    const pending = this.pendingMedia.get(mediaId);
    this.pendingMedia.delete(mediaId);
    if (!pending) {
      throw new BadRequestException('Mídia do envio não encontrada');
    }

    const endpoint = mediaEndpoint(kind);
    const caption = options?.caption?.trim();
    const data = await this.post<WahaSendResponse>(endpoint, {
      session: this.config.session,
      chatId: this.chatId(to),
      file: {
        mimetype: pending.mimeType,
        filename: options?.filename || pending.filename,
        data: pending.buffer.toString('base64'),
      },
      ...(caption && kind !== WhatsAppMessageKind.AUDIO ? { caption } : {}),
    });
    return this.sendResult(to, data);
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<WhatsAppSendResult> {
    const title = name?.trim() || address?.trim() || undefined;
    const data = await this.post<WahaSendResponse>('/api/sendLocation', {
      session: this.config.session,
      chatId: this.chatId(to),
      latitude,
      longitude,
      ...(title ? { title } : {}),
    });
    return this.sendResult(to, data);
  }

  async downloadMedia(mediaId: string): Promise<WhatsAppDownloadedMedia> {
    this.assertConfigured();
    const url = this.resolveMediaUrl(mediaId);
    try {
      const file = await firstValueFrom(
        this.http.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          timeout: 60_000,
          headers: this.authHeaders(),
        }),
      );
      const mimeType = String(
        file.headers['content-type'] ?? 'application/octet-stream',
      ).split(';')[0];
      const filename =
        filenameFromUrl(url) ||
        `arquivo.${mimeType.split('/')[1] || 'bin'}`;
      return {
        buffer: Buffer.from(file.data),
        mimeType,
        filename,
      };
    } catch (error) {
      throw new BadGatewayException(this.readError(error));
    }
  }

  async getBusinessPhone(): Promise<string> {
    if (this.businessPhoneCache) return this.businessPhoneCache;
    const session = await this.fetchSession();
    const phone = phoneFromMe(session.me);
    if (phone) this.businessPhoneCache = phone;
    return phone;
  }

  async getSession(): Promise<WhatsAppSessionInfo> {
    if (!this.config.isConfigured) {
      return {
        configured: false,
        name: this.config.session,
        status: null,
        phone: null,
        pushName: null,
      };
    }
    try {
      return this.toInfo(await this.fetchSession());
    } catch (error) {
      if (this.statusOf(error) === 404) {
        return {
          configured: true,
          name: this.config.session,
          status: 'STOPPED',
          phone: null,
          pushName: null,
        };
      }
      throw error;
    }
  }

  async getSessionQr(): Promise<Buffer> {
    this.assertConfigured();
    try {
      const response = await firstValueFrom(
        this.http.get<ArrayBuffer>(
          `/api/${encodeURIComponent(this.config.session)}/auth/qr`,
          {
            baseURL: this.config.baseUrl,
            responseType: 'arraybuffer',
            timeout: 20_000,
            headers: {
              ...this.authHeaders(),
              Accept: 'image/png',
            },
          },
        ),
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw new BadRequestException(this.readError(error));
    }
  }

  async restartSession(): Promise<WhatsAppSessionInfo> {
    this.assertConfigured();
    if (!(await this.sessionExists())) {
      await this.createSession();
      this.businessPhoneCache = null;
      return this.getSession();
    }
    const session = await this.fetchSession();
    const action = session.status === 'STOPPED' ? 'start' : 'restart';
    await this.post(
      `/api/sessions/${encodeURIComponent(this.config.session)}/${action}`,
      {},
    );
    this.businessPhoneCache = null;
    return this.getSession();
  }

  async logoutSession(): Promise<WhatsAppSessionInfo> {
    this.assertConfigured();
    await this.post(
      `/api/sessions/${encodeURIComponent(this.config.session)}/logout`,
      {},
    );
    this.businessPhoneCache = null;
    return this.getSession();
  }

  async ensureSession(): Promise<void> {
    if (!this.config.isConfigured) {
      this.logger.warn(
        'WAHA is not configured (WAHA_BASE_URL / WAHA_API_KEY). WhatsApp sends are disabled.',
      );
      return;
    }

    try {
      const session = await this.fetchSession();
      const hooks = session.config?.webhooks ?? [];
      const webhookReady =
        !this.config.webhookUrl ||
        hooks.some((hook) => hook.url === this.config.webhookUrl);
      if (!webhookReady) {
        await this.putSessionConfig();
        this.logger.log(
          `WAHA session "${this.config.session}" webhook updated`,
        );
        return;
      }
      if (session.status === 'STOPPED' || session.status === 'FAILED') {
        await this.post(
          `/api/sessions/${encodeURIComponent(this.config.session)}/start`,
          {},
        );
        this.logger.log(`WAHA session "${this.config.session}" started`);
      }
    } catch (error) {
      if (this.statusOf(error) === 404) {
        await this.createSession();
        this.logger.log(`WAHA session "${this.config.session}" created`);
        return;
      }
      this.logger.warn(
        `WAHA session bootstrap failed: ${this.readError(error)}`,
      );
    }
  }

  private async sessionExists(): Promise<boolean> {
    try {
      await this.fetchSession();
      return true;
    } catch (error) {
      if (this.statusOf(error) === 404) return false;
      throw error;
    }
  }

  private async createSession(): Promise<void> {
    await this.post('/api/sessions', {
      name: this.config.session,
      start: true,
      config: this.sessionConfig(),
    });
  }

  private async putSessionConfig(): Promise<void> {
    await this.request('put', `/api/sessions/${encodeURIComponent(this.config.session)}`, {
      name: this.config.session,
      config: this.sessionConfig(),
    });
  }

  private sessionConfig(): Record<string, unknown> {
    const webhook = this.config.webhookUrl
      ? {
          url: this.config.webhookUrl,
          events: WEBHOOK_EVENTS,
          ...(this.config.webhookHmacKey
            ? { hmac: { key: this.config.webhookHmacKey } }
            : {}),
        }
      : null;
    return {
      webhooks: webhook ? [webhook] : [],
      ignore: {
        status: true,
        groups: true,
        channels: true,
      },
    };
  }

  private async fetchSession(): Promise<WahaSession> {
    return this.request<WahaSession>(
      'get',
      `/api/sessions/${encodeURIComponent(this.config.session)}`,
    );
  }

  private toInfo(session: WahaSession): WhatsAppSessionInfo {
    return {
      configured: true,
      name: session.name || this.config.session,
      status: session.status ?? null,
      phone: phoneFromMe(session.me) || null,
      pushName: session.me?.pushName?.trim() || null,
    };
  }

  private resolveMediaUrl(mediaId: string): string {
    if (!mediaId.startsWith('http')) {
      return `${this.config.baseUrl}${mediaId.startsWith('/') ? '' : '/'}${mediaId}`;
    }
    try {
      const incoming = new URL(mediaId);
      if (incoming.pathname.startsWith('/api/files')) {
        const base = new URL(this.config.baseUrl);
        return `${base.origin}${incoming.pathname}${incoming.search}`;
      }
    } catch {
      return mediaId;
    }
    return mediaId;
  }

  private chatId(to: string): string {
    return `${normalizeWhatsAppPhone(to)}@c.us`;
  }

  private sendResult(to: string, data: WahaSendResponse): WhatsAppSendResult {
    return {
      whatsappMessageId: data.id ?? data.key?.id ?? null,
      to: normalizeWhatsAppPhone(to),
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('post', path, body);
  }

  private async request<T>(
    method: 'get' | 'post' | 'put',
    path: string,
    body?: unknown,
  ): Promise<T> {
    this.assertConfigured();
    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          method,
          url: path,
          baseURL: this.config.baseUrl,
          data: body,
          timeout: 60_000,
          headers: {
            ...this.authHeaders(),
            Accept: 'application/json',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
        }),
      );
      return response.data;
    } catch (error) {
      if (this.statusOf(error) === 404) {
        throw error;
      }
      throw new BadGatewayException(this.readError(error));
    }
  }

  private authHeaders(): Record<string, string> {
    return { 'X-Api-Key': this.config.apiKey };
  }

  private assertConfigured(): void {
    if (!this.config.isConfigured) {
      throw new ServiceUnavailableException(
        'WhatsApp is not configured (WAHA_BASE_URL / WAHA_API_KEY)',
      );
    }
  }

  private statusOf(error: unknown): number | null {
    if (isAxiosError(error)) return error.response?.status ?? null;
    return null;
  }

  private readError(error: unknown): string {
    if (isAxiosError(error)) {
      const data = error.response?.data as
        | { message?: string | string[]; error?: string }
        | undefined;
      if (Array.isArray(data?.message)) return data.message.join(', ');
      if (typeof data?.message === 'string' && data.message) return data.message;
      if (typeof data?.error === 'string' && data.error) return data.error;
      if (error.message) return error.message;
    }
    if (error instanceof Error) return error.message;
    return 'WAHA request failed';
  }
}

function mediaEndpoint(kind: WhatsAppMessageKind): string {
  if (kind === WhatsAppMessageKind.IMAGE) return '/api/sendImage';
  if (kind === WhatsAppMessageKind.VIDEO) return '/api/sendVideo';
  if (kind === WhatsAppMessageKind.AUDIO) return '/api/sendVoice';
  return '/api/sendFile';
}

function phoneFromMe(me: WahaMe | null | undefined): string {
  const id = me?.id?.trim() ?? '';
  if (!id) return '';
  return normalizeWhatsAppPhone(id);
}

function filenameFromUrl(url: string): string | null {
  try {
    const name = new URL(url).pathname.split('/').pop();
    return name ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}
