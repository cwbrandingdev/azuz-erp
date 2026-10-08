import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import {
  WhatsAppGraphGateway,
  type WhatsAppCallPermissionsResult,
  type WhatsAppCallSession,
  type WhatsAppSendTextResult,
} from '../domain/whatsapp-graph.gateway';
import { WhatsAppConfig } from './whatsapp.config';

type GraphErrorBody = {
  error?: { message?: string; code?: number; error_user_msg?: string };
};

type GraphSendResponse = GraphErrorBody & {
  messages?: Array<{ id: string }>;
  contacts?: Array<{ wa_id: string }>;
};

type GraphPhoneResponse = GraphErrorBody & {
  display_phone_number?: string;
};

type GraphCallResponse = GraphErrorBody & {
  success?: boolean;
  calls?: Array<{ id: string }>;
};

type GraphCallPermissionsResponse = GraphErrorBody & {
  permission?: { status?: string; expiration_time?: number };
  actions?: Array<{
    action_name?: string;
    can_perform_action?: boolean;
  }>;
};

const CALL_PERMISSION_ERROR = 138006;

@Injectable()
export class MetaWhatsAppGraphClient extends WhatsAppGraphGateway {
  private businessPhoneCache: string | null = null;
  private callingEnabled = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: WhatsAppConfig,
  ) {
    super();
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendTextResult> {
    this.assertConfigured();

    const data = await this.graphPost<GraphSendResponse>(
      `${this.phoneUrl()}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      },
    );

    return {
      whatsappMessageId: data.messages?.[0]?.id ?? null,
      to: data.contacts?.[0]?.wa_id ?? to,
    };
  }

  async getBusinessPhone(): Promise<string> {
    if (this.businessPhoneCache) {
      return this.businessPhoneCache;
    }

    this.assertConfigured();

    try {
      const data = await this.graphGet<GraphPhoneResponse>(this.phoneUrl(), {
        fields: 'display_phone_number',
      });
      const display = data.display_phone_number;
      this.businessPhoneCache = display
        ? normalizeWhatsAppPhone(display)
        : this.config.phoneNumberId;
      return this.businessPhoneCache;
    } catch {
      return this.config.phoneNumberId;
    }
  }

  async enableCalling(): Promise<void> {
    if (this.callingEnabled) {
      return;
    }
    this.assertConfigured();
    await this.graphPost(`${this.phoneUrl()}/settings`, {
      calling: {
        status: 'ENABLED',
        callback_permission_status: 'ENABLED',
        call_icon_visibility: 'DEFAULT',
      },
    });
    this.callingEnabled = true;
  }

  async getCallPermissions(
    userWaId: string,
  ): Promise<WhatsAppCallPermissionsResult> {
    this.assertConfigured();
    const data = await this.graphGet<GraphCallPermissionsResponse>(
      `${this.phoneUrl()}/call_permissions`,
      { user_wa_id: userWaId },
    );
    const actions = data.actions ?? [];
    return {
      status: data.permission?.status ?? 'no_permission',
      expirationTime: data.permission?.expiration_time ?? null,
      canStartCall: Boolean(
        actions.find((item) => item.action_name === 'start_call')
          ?.can_perform_action,
      ),
      canRequestPermission: Boolean(
        actions.find(
          (item) => item.action_name === 'send_call_permission_request',
        )?.can_perform_action,
      ),
    };
  }

  async sendCallPermissionRequest(
    to: string,
  ): Promise<WhatsAppSendTextResult> {
    this.assertConfigured();
    const data = await this.graphPost<GraphSendResponse>(
      `${this.phoneUrl()}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'call_permission_request',
          action: { name: 'call_permission_request' },
          body: {
            text: 'Podemos te ligar pelo WhatsApp para continuar o atendimento?',
          },
        },
      },
    );
    return {
      whatsappMessageId: data.messages?.[0]?.id ?? null,
      to: data.contacts?.[0]?.wa_id ?? to,
    };
  }

  async connectCall(
    to: string,
    session: WhatsAppCallSession,
  ): Promise<{ callId: string }> {
    await this.enableCalling().catch(() => undefined);
    const data = await this.graphPost<GraphCallResponse>(
      `${this.phoneUrl()}/calls`,
      {
        messaging_product: 'whatsapp',
        to,
        action: 'connect',
        session: {
          sdp_type: session.sdpType,
          sdp: session.sdp,
        },
      },
    );
    const callId = data.calls?.[0]?.id;
    if (!callId) {
      throw new BadGatewayException('WhatsApp did not return a call id');
    }
    return { callId };
  }

  async callAction(
    callId: string,
    action: 'pre_accept' | 'accept' | 'reject' | 'terminate',
    session?: WhatsAppCallSession,
  ): Promise<void> {
    this.assertConfigured();
    await this.graphPost<GraphCallResponse>(`${this.phoneUrl()}/calls`, {
      messaging_product: 'whatsapp',
      call_id: callId,
      action,
      ...(session
        ? {
            session: {
              sdp_type: session.sdpType,
              sdp: session.sdp,
            },
          }
        : {}),
    });
  }

  private phoneUrl(): string {
    return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}`;
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.config.permanentToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async graphGet<T extends GraphErrorBody>(
    url: string,
    params?: Record<string, string>,
  ): Promise<T> {
    this.assertConfigured();
    try {
      const response = await firstValueFrom(
        this.http.get<T>(url, {
          params,
          headers: this.authHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      throw this.toGraphException(error);
    }
  }

  private async graphPost<T extends GraphErrorBody>(
    url: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    this.assertConfigured();
    try {
      const response = await firstValueFrom(
        this.http.post<T>(url, body, { headers: this.authHeaders() }),
      );
      return response.data;
    } catch (error) {
      throw this.toGraphException(error);
    }
  }

  private assertConfigured(): void {
    if (!this.config.isConfigured) {
      throw new ServiceUnavailableException(
        'WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_PERMANENT_TOKEN)',
      );
    }
  }

  private toGraphException(error: unknown): Error {
    const parsed = this.readGraphError(error);
    if (parsed.code === CALL_PERMISSION_ERROR) {
      return new ForbiddenException({
        message: parsed.message,
        code: 'CALL_PERMISSION_REQUIRED',
      });
    }
    return new BadGatewayException(parsed.message);
  }

  private readGraphError(error: unknown): { message: string; code?: number } {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response
    ) {
      const data = error.response.data as GraphErrorBody;
      const message =
        data.error?.error_user_msg ||
        data.error?.message ||
        'Failed to call WhatsApp Graph API';
      return { message, code: data.error?.code };
    }
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { message: 'Failed to call WhatsApp Graph API' };
  }
}
