import { createHmac, timingSafeEqual } from 'crypto';

export interface WhatsappCloudTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string; preview_url?: boolean };
}

export interface WhatsappCloudTemplateMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

export interface WhatsappCloudSendResult {
  waMessageId: string | null;
  waId: string | null;
}

export class WhatsappCloudApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: number,
  ) {
    super(message);
    this.name = 'WhatsappCloudApiError';
  }
}

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_data?: { details?: string };
  };
}

interface GraphSendResponse {
  contacts?: Array<{ wa_id?: string }>;
  messages?: Array<{ id?: string }>;
}

export function verifyMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string | null,
): boolean {
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  const received = signatureHeader.slice('sha256='.length);

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export class WhatsappCloudClient {
  constructor(private readonly apiVersion: string) {}

  async sendText(
    accessToken: string,
    phoneNumberId: string,
    to: string,
    body: string,
  ): Promise<WhatsappCloudSendResult> {
    return this.send(accessToken, phoneNumberId, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: true },
    });
  }

  async sendTemplate(
    accessToken: string,
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode: string,
    parameters: string[] = [],
  ): Promise<WhatsappCloudSendResult> {
    const payload: WhatsappCloudTemplateMessage = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (parameters.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: parameters.map((text) => ({ type: 'text', text })),
        },
      ];
    }

    return this.send(accessToken, phoneNumberId, payload);
  }

  private async send(
    accessToken: string,
    phoneNumberId: string,
    payload: WhatsappCloudTextMessage | WhatsappCloudTemplateMessage,
  ): Promise<WhatsappCloudSendResult> {
    const url = `${this.graphBase()}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => ({}))) as
      | GraphSendResponse
      | GraphErrorBody;

    if (!response.ok) {
      const error = (json as GraphErrorBody).error;
      throw new WhatsappCloudApiError(
        error?.error_data?.details ||
          error?.message ||
          `Falha ao enviar WhatsApp (${response.status})`,
        response.status,
        error?.code,
      );
    }

    const sent = json as GraphSendResponse;
    return {
      waMessageId: sent.messages?.[0]?.id ?? null,
      waId: sent.contacts?.[0]?.wa_id ?? null,
    };
  }

  async exchangeEmbeddedSignupCode(
    appId: string,
    appSecret: string,
    code: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });
    const json = await this.requestJson<{ access_token?: string }>(
      `/oauth/access_token?${params.toString()}`,
      { method: 'GET' },
    );
    if (!json.access_token) {
      throw new WhatsappCloudApiError(
        'A Meta não devolveu um access token no Embedded Signup.',
      );
    }
    return json.access_token;
  }

  async subscribeWaba(accessToken: string, wabaId: string): Promise<void> {
    await this.requestJson(`/${wabaId}/subscribed_apps`, {
      method: 'POST',
      accessToken,
    });
  }

  async registerPhoneNumber(
    accessToken: string,
    phoneNumberId: string,
    pin: string,
  ): Promise<void> {
    try {
      await this.requestJson(`/${phoneNumberId}/register`, {
        method: 'POST',
        accessToken,
        body: { messaging_product: 'whatsapp', pin },
      });
    } catch (error) {
      if (error instanceof WhatsappCloudApiError && error.code === 133016) {
        return;
      }
      throw error;
    }
  }

  private async requestJson<T>(
    path: string,
    options: {
      method: 'GET' | 'POST';
      accessToken?: string;
      body?: unknown;
    },
  ): Promise<T> {
    const response = await fetch(`${this.graphBase()}${path}`, {
      method: options.method,
      headers: {
        ...(options.accessToken
          ? { Authorization: `Bearer ${options.accessToken}` }
          : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = (await response.json().catch(() => ({}))) as T | GraphErrorBody;
    if (!response.ok) {
      const error = (json as GraphErrorBody).error;
      throw new WhatsappCloudApiError(
        error?.error_data?.details ||
          error?.message ||
          `Falha na Graph API (${response.status})`,
        response.status,
        error?.code,
      );
    }
    return json as T;
  }

  private graphBase() {
    const version = this.apiVersion.replace(/^\/+/, '') || 'v21.0';
    return `https://graph.facebook.com/${version}`;
  }
}
