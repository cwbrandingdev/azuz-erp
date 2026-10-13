import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { readFileSync } from 'fs';
import { AiService } from '../../ai/ai.service';
import {
  mapMetaStatus,
  kindFromMime,
  WhatsAppDirection,
  WhatsAppMessageKind,
  WhatsAppStatus,
  type ConversationListFilter,
  type ConversationPatch,
  type WhatsAppCannedResponseRecord,
  type WhatsAppConversationSummary,
  type WhatsAppMessageRecord,
} from '../domain/whatsapp-message';
import {
  parseInboundMessage,
  type MetaInboundMessage,
} from '../domain/whatsapp-inbound';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';
import { WhatsAppMediaStore } from '../infrastructure/whatsapp-media.store';
import { WhatsAppAutomationService } from './whatsapp-automation.service';
import { WhatsAppRoutingService } from './whatsapp-routing.service';

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: MetaInboundMessage[];
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
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly messages: WhatsAppMessageRepository,
    private readonly graph: WhatsAppGraphGateway,
    private readonly config: WhatsAppConfig,
    private readonly routing: WhatsAppRoutingService,
    private readonly media: WhatsAppMediaStore,
    private readonly ai: AiService,
    @Inject(forwardRef(() => WhatsAppAutomationService))
    private readonly automation: WhatsAppAutomationService,
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
    agentReply = true,
  ): Promise<WhatsAppMessageRecord> {
    const recipient = normalizeWhatsAppPhone(to);
    const result = await this.graph.sendText(recipient, message);
    return this.persistOutbound({
      to: result.to,
      body: message,
      userId,
      whatsappMessageId: result.whatsappMessageId,
      agentReply,
    });
  }

  async sendMedia(
    to: string,
    file: Express.Multer.File,
    caption: string | undefined,
    userId?: string,
  ): Promise<WhatsAppMessageRecord> {
    if (!file?.buffer && !file?.path) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    const buffer = file.buffer ?? readFileSync(file.path);
    const mimeType = file.mimetype || 'application/octet-stream';
    const filename = file.originalname || 'arquivo';
    const kind = kindFromMime(mimeType);
    const stored = this.media.save(buffer, filename, mimeType);
    const recipient = normalizeWhatsAppPhone(to);
    const mediaId = await this.graph.uploadMedia(buffer, mimeType, filename);
    const result = await this.graph.sendMedia(recipient, kind, mediaId, {
      caption,
      filename,
    });
    return this.persistOutbound({
      to: result.to,
      body: caption?.trim() || stored.filename,
      userId,
      whatsappMessageId: result.whatsappMessageId,
      agentReply: true,
      kind,
      mediaUrl: stored.url,
      mediaMimeType: mimeType,
      mediaFilename: filename,
      isVoiceNote: kind === WhatsAppMessageKind.AUDIO,
    });
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name: string | undefined,
    address: string | undefined,
    userId?: string,
  ): Promise<WhatsAppMessageRecord> {
    const recipient = normalizeWhatsAppPhone(to);
    const result = await this.graph.sendLocation(
      recipient,
      latitude,
      longitude,
      name,
      address,
    );
    return this.persistOutbound({
      to: result.to,
      body: name || address || `${latitude}, ${longitude}`,
      userId,
      whatsappMessageId: result.whatsappMessageId,
      agentReply: true,
      kind: WhatsAppMessageKind.LOCATION,
      latitude,
      longitude,
      locationName: name ?? null,
      locationAddress: address ?? null,
    });
  }

  async sendTemplate(
    to: string,
    name: string,
    language: string,
    parameters: string[],
    userId?: string,
    agentReply = true,
  ): Promise<WhatsAppMessageRecord> {
    const recipient = normalizeWhatsAppPhone(to);
    const result = await this.graph.sendTemplate(
      recipient,
      name,
      language,
      parameters,
    );
    const preview =
      parameters.length > 0
        ? `${name}: ${parameters.join(' · ')}`
        : `Template ${name}`;
    return this.persistOutbound({
      to: result.to,
      body: preview,
      userId,
      whatsappMessageId: result.whatsappMessageId,
      agentReply,
      kind: WhatsAppMessageKind.TEMPLATE,
      templateName: name,
      templateLanguage: language,
    });
  }

  async sendCanned(
    to: string,
    cannedId: string,
    userId?: string,
  ): Promise<WhatsAppMessageRecord> {
    const canned = (await this.messages.listCannedResponses()).find(
      (item) => item.id === cannedId,
    );
    if (!canned) {
      throw new BadRequestException('Resposta pronta não encontrada');
    }
    if (canned.mediaUrl) {
      const path = this.media.resolvePath(canned.mediaUrl);
      if (!path) {
        throw new BadRequestException('Mídia da resposta pronta inválida');
      }
      const buffer = readFileSync(path);
      const mimeType = canned.mediaMimeType || 'application/octet-stream';
      const filename = canned.mediaFilename || 'arquivo';
      return this.sendMedia(
        to,
        {
          buffer,
          mimetype: mimeType,
          originalname: filename,
          path,
        } as Express.Multer.File,
        canned.content,
        userId,
      );
    }
    return this.send(to, canned.content, userId);
  }

  listTemplates() {
    return this.graph.listTemplates();
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
      ...this.emptyMediaFields(),
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
    companyId?: string,
  ): Promise<WhatsAppConversationSummary[]> {
    const settings = await this.routing.getSettings(
      companyId ?? '00000000-0000-4000-8000-000000000001',
    );
    const rows = await this.messages.listConversations({
      ...filter,
      slaMinutes: settings.slaFirstResponseMinutes,
    });
    const withLeads = await this.routing.attachLeads(
      rows,
      companyId ?? '00000000-0000-4000-8000-000000000001',
    );
    return withLeads.filter((item) => {
      if (filter.stageId && item.lead?.stageId !== filter.stageId) return false;
      if (
        filter.source &&
        item.lead?.source?.toLowerCase() !== filter.source.toLowerCase()
      ) {
        return false;
      }
      if (filter.leadStatus && item.lead?.status !== filter.leadStatus) {
        return false;
      }
      return true;
    });
  }

  async getConversation(
    phone: string,
    companyId?: string,
  ): Promise<WhatsAppConversationSummary | null> {
    const conversation = await this.messages.getConversation(
      normalizeWhatsAppPhone(phone),
    );
    if (!conversation) return null;
    const settings = await this.routing.getSettings(
      companyId ?? '00000000-0000-4000-8000-000000000001',
    );
    conversation.slaBreached =
      conversation.waitingSeconds > settings.slaFirstResponseMinutes * 60;
    const [enriched] = await this.routing.attachLeads(
      [conversation],
      companyId ?? '00000000-0000-4000-8000-000000000001',
    );
    return enriched;
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
    file?: Express.Multer.File;
  }): Promise<WhatsAppCannedResponseRecord> {
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;
    let mediaFilename: string | null = null;
    let kind = WhatsAppMessageKind.TEXT;
    if (input.file) {
      const buffer = input.file.buffer ?? readFileSync(input.file.path);
      const stored = this.media.save(
        buffer,
        input.file.originalname,
        input.file.mimetype,
      );
      mediaUrl = stored.url;
      mediaMimeType = input.file.mimetype;
      mediaFilename = input.file.originalname;
      kind = kindFromMime(input.file.mimetype);
    }
    if (!input.content.trim() && !mediaUrl) {
      throw new BadRequestException('Informe texto ou um arquivo');
    }
    return this.messages.createCannedResponse({
      shortCode: input.shortCode,
      title: input.title,
      content: input.content,
      kind,
      mediaUrl,
      mediaMimeType,
      mediaFilename,
    });
  }

  deleteCannedResponse(id: string): Promise<void> {
    return this.messages.deleteCannedResponse(id);
  }

  private async persistOutbound(input: {
    to: string;
    body: string;
    userId?: string;
    whatsappMessageId: string | null;
    agentReply: boolean;
    kind?: WhatsAppMessageKind;
    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaFilename?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    locationAddress?: string | null;
    isVoiceNote?: boolean;
    templateName?: string | null;
    templateLanguage?: string | null;
  }): Promise<WhatsAppMessageRecord> {
    const businessPhone = await this.graph.getBusinessPhone();
    const conversation = await this.messages.upsertConversation({
      phone: input.to,
      preview: input.body,
      inbound: false,
      agentReply: input.agentReply,
    });
    return this.messages.create({
      ...this.emptyMediaFields(),
      whatsappMessageId: input.whatsappMessageId,
      fromPhone: businessPhone,
      toPhone: input.to,
      body: input.body,
      kind: input.kind ?? WhatsAppMessageKind.TEXT,
      mediaUrl: input.mediaUrl ?? null,
      mediaMimeType: input.mediaMimeType ?? null,
      mediaFilename: input.mediaFilename ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationName: input.locationName ?? null,
      locationAddress: input.locationAddress ?? null,
      isVoiceNote: input.isVoiceNote ?? false,
      templateName: input.templateName ?? null,
      templateLanguage: input.templateLanguage ?? null,
      direction: WhatsAppDirection.OUTBOUND,
      status: WhatsAppStatus.SENT,
      isPrivate: false,
      sentByUserId: input.userId ?? null,
      conversationId: conversation.id,
    });
  }

  private async persistInbound(
    message: MetaInboundMessage,
    contactName: string | null,
  ): Promise<void> {
    const parsed = parseInboundMessage(message);
    const from = message.from ? normalizeWhatsAppPhone(message.from) : '';
    if (!parsed || !from) {
      return;
    }

    if (message.id) {
      const existing = await this.messages.findByWhatsappMessageId(message.id);
      if (existing) {
        return;
      }
    }

    let mediaUrl: string | null = null;
    let mediaMimeType = parsed.mediaMimeType;
    let mediaFilename = parsed.mediaFilename;
    let transcription = parsed.transcription;
    let downloaded: { buffer: Buffer; mimeType: string } | null = null;

    if (parsed.mediaId) {
      try {
        const file = await this.graph.downloadMedia(parsed.mediaId);
        const stored = this.media.save(file.buffer, file.filename, file.mimeType);
        mediaUrl = stored.url;
        mediaMimeType = file.mimeType;
        mediaFilename = parsed.mediaFilename || file.filename;
        downloaded = { buffer: file.buffer, mimeType: file.mimeType };
      } catch (error) {
        this.logger.warn(
          `Failed to download WhatsApp media ${parsed.mediaId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const businessPhone = await this.graph.getBusinessPhone();
    const conversation = await this.messages.upsertConversation({
      phone: from,
      name: contactName,
      preview: parsed.body,
      inbound: true,
      reopen: true,
    });
    const [withLead] = await this.routing.attachLeads([conversation]);

    const created = await this.messages.create({
      ...this.emptyMediaFields(),
      whatsappMessageId: message.id ?? null,
      fromPhone: from,
      toPhone: businessPhone,
      body: parsed.body,
      kind: parsed.kind,
      mediaUrl,
      mediaMimeType,
      mediaFilename,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      locationName: parsed.locationName,
      locationAddress: parsed.locationAddress,
      isViewOnce: parsed.isViewOnce,
      isVoiceNote: parsed.isVoiceNote,
      transcription,
      direction: WhatsAppDirection.INBOUND,
      status: WhatsAppStatus.DELIVERED,
      isPrivate: false,
      sentByUserId: null,
      conversationId: conversation.id,
    });

    if (parsed.isVoiceNote && !transcription && downloaded) {
      void this.transcribeLater(created.id, downloaded.buffer, downloaded.mimeType);
    }

    void this.automation
      .handleInbound({
        phone: from,
        body: parsed.transcription || parsed.body,
        conversation: withLead,
      })
      .catch((error) =>
        this.logger.warn(
          `Automation inbound failed: ${
            error instanceof Error ? error.message : error
          }`,
        ),
      );
  }

  private async transcribeLater(
    messageId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      const text = await this.ai.transcribeAudio(buffer, mimeType);
      if (text) {
        await this.messages.updateMessage(messageId, { transcription: text });
      }
    } catch (error) {
      this.logger.warn(
        `Voice transcription failed: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
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
    void this.automation
      .onMessageStatus(status.id, mapped)
      .catch((error) =>
        this.logger.warn(
          `Automation status failed: ${
            error instanceof Error ? error.message : error
          }`,
        ),
      );
  }

  private emptyMediaFields(): Pick<
    WhatsAppMessageRecord,
    | 'kind'
    | 'mediaUrl'
    | 'mediaMimeType'
    | 'mediaFilename'
    | 'latitude'
    | 'longitude'
    | 'locationName'
    | 'locationAddress'
    | 'isViewOnce'
    | 'isVoiceNote'
    | 'transcription'
    | 'templateName'
    | 'templateLanguage'
  > {
    return {
      kind: WhatsAppMessageKind.TEXT,
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      latitude: null,
      longitude: null,
      locationName: null,
      locationAddress: null,
      isViewOnce: false,
      isVoiceNote: false,
      transcription: null,
      templateName: null,
      templateLanguage: null,
    };
  }
}
