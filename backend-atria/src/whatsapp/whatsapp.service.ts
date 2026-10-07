import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import {
  CompanySettingsService,
  type CompanyWhatsappCredentials,
} from '../company-settings/company-settings.service';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import {
  WhatsappCloudApiError,
  WhatsappCloudClient,
  verifyMetaSignature,
} from './whatsapp-cloud.client';
import {
  lastPhoneDigits,
  previewText,
  toWhatsappId,
} from './whatsapp-phone.util';
import { parseWhatsappWebhook } from './whatsapp-webhook.parser';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly cloud: WhatsappCloudClient;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly companySettings: CompanySettingsService,
    private readonly crmScope: CrmScopeService,
  ) {
    this.cloud = new WhatsappCloudClient(
      this.config.get<string>('META_API_VERSION')?.trim() || 'v21.0',
    );
  }

  async getPublicConfig() {
    const credentials =
      await this.companySettings.getWhatsappCredentialsForCurrentTenant();
    return {
      configured: this.isConfigured(credentials),
      phoneNumberId: credentials.phoneNumberId,
      webhookUrl: this.buildWebhookUrl(),
      embeddedSignup:
        await this.companySettings.getWhatsappEmbeddedSignupPublicConfig(),
    };
  }

  async completeEmbeddedSignup(dto: {
    code: string;
    wabaId: string;
    phoneNumberId: string;
    pin?: string;
  }) {
    const auth = await this.companySettings.getMetaAppAuthForCurrentTenant();
    if (!auth.appId || !auth.appSecret) {
      throw new ServiceUnavailableException(
        'Preencha App ID e App Secret do WhatsApp em Integrações APIs para conectar pelo QR.',
      );
    }

    const code = dto.code.trim();
    const wabaId = dto.wabaId.trim();
    const phoneNumberId = dto.phoneNumberId.trim();
    if (!code || !wabaId || !phoneNumberId) {
      throw new BadRequestException(
        'O popup da Meta não devolveu code, WABA ID e Phone Number ID.',
      );
    }

    let accessToken: string;
    try {
      accessToken = await this.cloud.exchangeEmbeddedSignupCode(
        auth.appId,
        auth.appSecret,
        code,
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof WhatsappCloudApiError
          ? error.message
          : 'Não foi possível trocar o código do Embedded Signup por um token.',
      );
    }

    try {
      await this.cloud.subscribeWaba(accessToken, wabaId);
    } catch (error) {
      this.logger.warn(
        `Falha ao inscrever webhooks da WABA ${wabaId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      await this.cloud.registerPhoneNumber(
        accessToken,
        phoneNumberId,
        dto.pin?.trim() || '000000',
      );
    } catch (error) {
      this.logger.warn(
        `Registro do número ${phoneNumberId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await this.companySettings.saveWhatsappConnection({
      accessToken,
      phoneNumberId,
      businessAccountId: wabaId,
    });

    this.logger.log(
      `WhatsApp conectado via Embedded Signup (WABA ${wabaId}, phone ${phoneNumberId}).`,
    );

    return this.getPublicConfig();
  }

  async verifyWebhook(query: Record<string, unknown>) {
    const mode = this.hubQueryValue(query, 'mode');
    const token = this.hubQueryValue(query, 'verify_token');
    const challenge = this.hubQueryValue(query, 'challenge');

    if (mode !== 'subscribe' || !token || !challenge) {
      throw new BadRequestException('Parâmetros de verificação inválidos.');
    }

    const envToken = this.config.get<string>('WHATSAPP_VERIFY_TOKEN')?.trim();
    if (envToken && envToken === token) {
      return challenge;
    }

    const match =
      await this.companySettings.findWhatsappCredentialsByVerifyToken(token);
    if (!match) {
      throw new ForbiddenException('Verify token do WhatsApp não confere.');
    }

    return challenge;
  }

  async handleWebhook(req: {
    body?: unknown;
    rawBody?: Buffer;
    headers: { [key: string]: string | string[] | undefined };
  }) {
    const { messages, statuses } = parseWhatsappWebhook(req.body);
    const phoneNumberId =
      messages[0]?.phoneNumberId || statuses[0]?.phoneNumberId;
    if (!phoneNumberId) {
      return { received: true };
    }

    const credentials =
      (await this.companySettings.findWhatsappCredentialsByPhoneNumberId(
        phoneNumberId,
      )) ??
      (await this.companySettings.getWhatsappCredentialsForCurrentTenant());

    if (
      credentials.phoneNumberId &&
      credentials.phoneNumberId !== phoneNumberId
    ) {
      this.logger.warn(
        `Webhook WhatsApp ignorado: phone_number_id ${phoneNumberId} não mapeado.`,
      );
      return { received: true };
    }

    const signature = this.header(req.headers, 'x-hub-signature-256');
    const rawBody = req.rawBody;
    if (
      rawBody &&
      !verifyMetaSignature(rawBody, signature, credentials.metaAppSecret)
    ) {
      throw new ForbiddenException('Assinatura do webhook WhatsApp inválida.');
    }

    for (const inbound of messages) {
      await this.persistInbound(credentials.companyId, inbound);
    }

    for (const status of statuses) {
      await this.persistStatus(credentials.companyId, status);
    }

    return { received: true };
  }

  async listConversations(
    user: AuthenticatedUser,
    filters: { leadId?: string; clientId?: string },
  ) {
    if (filters.leadId) {
      await this.findLeadForUser(user, filters.leadId);
    }

    const conversations = await this.prisma.whatsappConversation.findMany({
      where: {
        companyId: this.companyId(user),
        ...(filters.leadId ? { leadId: filters.leadId } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        client: { select: { id: true, companyName: true, phone: true } },
      },
    });

    return conversations.map((conversation) => this.toConversationResponse(conversation));
  }

  async listMessages(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.whatsappConversation.findFirst({
      where: { id: conversationId, companyId: this.companyId(user) },
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    if (conversation.leadId) {
      await this.findLeadForUser(user, conversation.leadId);
    }

    const messages = await this.prisma.whatsappMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sentBy: { select: { id: true, name: true } },
      },
    });

    if (conversation.unreadCount > 0) {
      await this.prisma.whatsappConversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      });
    }

    return messages.map((message) => this.toMessageResponse(message));
  }

  async sendMessage(user: AuthenticatedUser, dto: SendWhatsappMessageDto) {
    const credentials = await this.requireCredentials();
    const body = dto.body?.trim() ?? '';
    const templateName = dto.templateName?.trim() ?? '';
    if (!body && !templateName) {
      throw new BadRequestException('Informe o texto ou um template da Meta.');
    }

    const lead = dto.leadId
      ? await this.findLeadForUser(user, dto.leadId)
      : null;
    const waId = toWhatsappId(dto.to || lead?.phone);
    if (!waId) {
      throw new BadRequestException(
        'Telefone inválido. Use DDD brasileiro (10 ou 11 dígitos).',
      );
    }

    const conversation = await this.upsertConversation({
      companyId: credentials.companyId,
      waId,
      phone: lead?.phone ?? dto.to ?? waId,
      leadId: lead?.id ?? dto.leadId ?? null,
      clientId: dto.clientId ?? lead?.organizationId ?? null,
    });

    const type = templateName ? 'TEMPLATE' : 'TEXT';
    const preview = previewText(
      body || (templateName ? `Template: ${templateName}` : null),
    );

    const pending = await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conversation.id,
        companyId: credentials.companyId,
        direction: 'OUTBOUND',
        type,
        body: body || null,
        templateName: templateName || null,
        status: 'PENDING',
        sentByUserId: user.userId,
      },
      include: { sentBy: { select: { id: true, name: true } } },
    });

    try {
      const result = templateName
        ? await this.cloud.sendTemplate(
            credentials.accessToken as string,
            credentials.phoneNumberId as string,
            waId,
            templateName,
            dto.templateLanguage?.trim() || 'pt_BR',
            dto.templateParameters ?? [],
          )
        : await this.cloud.sendText(
            credentials.accessToken as string,
            credentials.phoneNumberId as string,
            waId,
            body,
          );

      const sent = await this.prisma.whatsappMessage.update({
        where: { id: pending.id },
        data: {
          status: 'SENT',
          waMessageId: result.waMessageId,
        },
        include: { sentBy: { select: { id: true, name: true } } },
      });

      await this.prisma.whatsappConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: sent.createdAt,
          lastMessagePreview: preview,
          waId: result.waId || conversation.waId,
        },
      });

      return this.toMessageResponse(sent);
    } catch (error) {
      const message =
        error instanceof WhatsappCloudApiError
          ? error.message
          : 'Falha ao enviar mensagem no WhatsApp.';

      await this.prisma.whatsappMessage.update({
        where: { id: pending.id },
        data: { status: 'FAILED', errorMessage: message },
      });

      throw new ServiceUnavailableException(message);
    }
  }

  private async persistInbound(
    companyId: string,
    inbound: {
      waId: string;
      waMessageId: string;
      type: string;
      body: string | null;
      timestamp: string | null;
    },
  ) {
    const existing = await this.prisma.whatsappMessage.findUnique({
      where: { waMessageId: inbound.waMessageId },
    });
    if (existing) return;

    const lead = await this.findLeadByWaId(companyId, inbound.waId);
    const client = lead
      ? null
      : await this.findClientByWaId(companyId, inbound.waId);

    const conversation = await this.upsertConversation({
      companyId,
      waId: inbound.waId,
      phone: inbound.waId,
      leadId: lead?.id ?? null,
      clientId: client?.id ?? lead?.organizationId ?? null,
    });

    const parsed = inbound.timestamp ? Number(inbound.timestamp) : NaN;
    const createdAt = Number.isFinite(parsed)
      ? new Date(parsed * 1000)
      : new Date();

    await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conversation.id,
        companyId,
        direction: 'INBOUND',
        type: inbound.type,
        body: inbound.body,
        waMessageId: inbound.waMessageId,
        status: 'DELIVERED',
        createdAt,
      },
    });

    await this.prisma.whatsappConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: createdAt,
        lastMessagePreview: previewText(inbound.body),
        unreadCount: { increment: 1 },
        leadId: conversation.leadId ?? lead?.id ?? undefined,
        clientId: conversation.clientId ?? client?.id ?? undefined,
      },
    });
  }

  private async persistStatus(
    companyId: string,
    update: {
      waMessageId: string;
      status: string;
      errorMessage: string | null;
    },
  ) {
    const message = await this.prisma.whatsappMessage.findFirst({
      where: { companyId, waMessageId: update.waMessageId },
    });
    if (!message) return;

    await this.prisma.whatsappMessage.update({
      where: { id: message.id },
      data: {
        status: update.status,
        errorMessage: update.errorMessage,
      },
    });
  }

  private async upsertConversation(input: {
    companyId: string;
    waId: string;
    phone: string;
    leadId: string | null;
    clientId: string | null;
  }) {
    const existing = await this.prisma.whatsappConversation.findUnique({
      where: {
        companyId_waId: { companyId: input.companyId, waId: input.waId },
      },
    });
    if (existing) {
      if (
        (input.leadId && !existing.leadId) ||
        (input.clientId && !existing.clientId)
      ) {
        return this.prisma.whatsappConversation.update({
          where: { id: existing.id },
          data: {
            leadId: existing.leadId ?? input.leadId,
            clientId: existing.clientId ?? input.clientId,
            phone: existing.phone ?? input.phone,
          },
        });
      }
      return existing;
    }

    return this.prisma.whatsappConversation.create({
      data: {
        companyId: input.companyId,
        waId: input.waId,
        phone: input.phone,
        leadId: input.leadId,
        clientId: input.clientId,
      },
    });
  }

  private async findLeadByWaId(companyId: string, waId: string) {
    const needle = lastPhoneDigits(waId);
    if (needle.length < 8) return null;

    return this.prisma.lead.findFirst({
      where: {
        companyId,
        deletedAt: null,
        phone: { contains: needle },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async findClientByWaId(companyId: string, waId: string) {
    const needle = lastPhoneDigits(waId);
    if (needle.length < 8) return null;

    return this.prisma.client.findFirst({
      where: {
        companyId,
        phone: { contains: needle },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async findLeadForUser(user: AuthenticatedUser, id: string) {
    const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...orgFilter },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }
    await this.crmScope.assertLeadAccess(user, lead);
    return lead;
  }

  private async requireCredentials(): Promise<
    CompanyWhatsappCredentials & { accessToken: string; phoneNumberId: string }
  > {
    const credentials =
      await this.companySettings.getWhatsappCredentialsForCurrentTenant();
    if (!this.isConfigured(credentials)) {
      throw new ServiceUnavailableException(
        'WhatsApp não configurado. Preencha token e Phone Number ID em Integrações APIs.',
      );
    }
    return credentials as CompanyWhatsappCredentials & {
      accessToken: string;
      phoneNumberId: string;
    };
  }

  private isConfigured(credentials: CompanyWhatsappCredentials) {
    return Boolean(credentials.accessToken && credentials.phoneNumberId);
  }

  private companyId(user: AuthenticatedUser) {
    return user.companyId ?? DEFAULT_COMPANY_ID;
  }

  private buildWebhookUrl() {
    const base =
      this.config.get<string>('APP_URL')?.trim().replace(/\/$/, '') ||
      this.config
        .get<string>('TWILIO_WEBHOOK_BASE_URL')
        ?.trim()
        .replace(/\/$/, '') ||
      '';
    return base ? `${base}/whatsapp/webhook` : '/whatsapp/webhook';
  }

  private hubQueryValue(
    query: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const dotted = query[`hub.${key}`];
    if (typeof dotted === 'string' && dotted.trim()) return dotted;
    const hub = query.hub;
    if (hub && typeof hub === 'object' && !Array.isArray(hub)) {
      const value = (hub as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return undefined;
  }

  private header(
    headers: { [key: string]: string | string[] | undefined },
    name: string,
  ) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private toConversationResponse(conversation: {
    id: string;
    waId: string;
    phone: string | null;
    leadId: string | null;
    clientId: string | null;
    lastMessageAt: Date;
    lastMessagePreview: string | null;
    unreadCount: number;
    lead: { id: string; name: string; phone: string | null } | null;
    client: { id: string; companyName: string; phone: string | null } | null;
  }) {
    return {
      id: conversation.id,
      waId: conversation.waId,
      phone: conversation.phone,
      leadId: conversation.leadId,
      clientId: conversation.clientId,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      lastMessagePreview: conversation.lastMessagePreview,
      unreadCount: conversation.unreadCount,
      lead: conversation.lead,
      client: conversation.client
        ? {
            id: conversation.client.id,
            name: conversation.client.companyName,
            phone: conversation.client.phone,
          }
        : null,
    };
  }

  private toMessageResponse(message: {
    id: string;
    conversationId: string;
    direction: string;
    type: string;
    body: string | null;
    templateName: string | null;
    waMessageId: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
    sentBy: { id: string; name: string } | null;
  }) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      direction: message.direction,
      type: message.type,
      body: message.body,
      templateName: message.templateName,
      waMessageId: message.waMessageId,
      status: message.status,
      errorMessage: message.errorMessage,
      createdAt: message.createdAt.toISOString(),
      sentBy: message.sentBy,
    };
  }
}
