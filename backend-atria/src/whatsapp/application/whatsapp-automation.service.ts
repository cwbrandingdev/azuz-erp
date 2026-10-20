import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  TransactionStatus,
  TransactionType,
  WhatsAppBotSessionStatus,
  WhatsAppBroadcastRecipientStatus,
  WhatsAppBroadcastStatus,
  WhatsAppConversationStatus,
  WhatsAppCrmEventType,
  WhatsAppTriggerEvent,
} from '@prisma/client';
import { AiService } from '../../ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  defaultWhatsAppBotDefinition,
  extractPlaceholders,
  interpolateTemplate,
  parseBotDefinition,
  wantsHumanHandoff,
  type WhatsAppBotDefinition,
  type WhatsAppBotNode,
} from '../domain/whatsapp-bot-flow';
import { WhatsAppStatus } from '../domain/whatsapp-message';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import { WhatsAppRoutingService } from './whatsapp-routing.service';
import { WhatsAppService } from './whatsapp.service';
import type { WhatsAppConversationSummary } from '../domain/whatsapp-message';

const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';

type Collected = Record<string, string>;

@Injectable()
export class WhatsAppAutomationService {
  private readonly logger = new Logger(WhatsAppAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsApp: WhatsAppService,
    private readonly routing: WhatsAppRoutingService,
    private readonly ai: AiService,
  ) {}

  async handleInbound(input: {
    companyId?: string;
    phone: string;
    body: string;
    conversation: WhatsAppConversationSummary;
  }): Promise<void> {
    const companyId = input.companyId ?? DEFAULT_COMPANY;
    const phone = normalizeWhatsAppPhone(input.phone);
    const body = (input.body || '').trim();
    if (!phone) return;

    await this.markBroadcastReplies(phone);

    if (input.conversation.assignedUser) {
      return;
    }

    const settings = await this.routing.getSettings(companyId);
    const session = await this.prisma.whatsAppBotSession.findUnique({
      where: { companyId_phone: { companyId, phone } },
    });
    const botActive =
      session?.status === WhatsAppBotSessionStatus.ACTIVE ||
      (settings.botEnabled && !session);

    if (botActive) {
      const handled = await this.runBot({
        companyId,
        phone,
        inbound: body,
        conversation: input.conversation,
      });
      if (handled) return;
    }

    await this.routing.assignIncoming(input.conversation, companyId);

    const afterAssign = await this.prisma.whatsAppConversation.findFirst({
      where: { phone },
      select: { assignedUserId: true },
    });
    if (afterAssign?.assignedUserId) return;
    if (!settings.aiAutoReply || !body) return;

    await this.replyWithAi({
      companyId,
      phone,
      inbound: body,
      conversation: input.conversation,
    });
  }

  async onMessageStatus(
    whatsappMessageId: string,
    status: WhatsAppStatus,
  ): Promise<void> {
    const mapped =
      status === WhatsAppStatus.DELIVERED
        ? WhatsAppBroadcastRecipientStatus.DELIVERED
        : status === WhatsAppStatus.READ
          ? WhatsAppBroadcastRecipientStatus.READ
          : status === WhatsAppStatus.FAILED
            ? WhatsAppBroadcastRecipientStatus.FAILED
            : null;
    if (!mapped) return;

    const recipient = await this.prisma.whatsAppBroadcastRecipient.findFirst({
      where: { whatsappMessageId },
    });
    if (!recipient) return;
    if (
      recipient.status === WhatsAppBroadcastRecipientStatus.REPLIED ||
      recipient.status === WhatsAppBroadcastRecipientStatus.FAILED
    ) {
      return;
    }
    if (
      recipient.status === WhatsAppBroadcastRecipientStatus.READ &&
      mapped !== WhatsAppBroadcastRecipientStatus.FAILED
    ) {
      return;
    }

    await this.prisma.whatsAppBroadcastRecipient.update({
      where: { id: recipient.id },
      data: { status: mapped },
    });
    const increment =
      mapped === WhatsAppBroadcastRecipientStatus.DELIVERED
        ? { deliveredCount: { increment: 1 } }
        : mapped === WhatsAppBroadcastRecipientStatus.READ
          ? { readCount: { increment: 1 } }
          : { failedCount: { increment: 1 } };
    await this.prisma.whatsAppBroadcast.update({
      where: { id: recipient.broadcastId },
      data: increment,
    });
  }

  async onStageMove(input: {
    companyId: string;
    leadId: string;
    phone: string | null;
    toStageId: string;
    toStageName: string;
  }): Promise<void> {
    const phone = input.phone ? normalizeWhatsAppPhone(input.phone) : '';
    if (!phone) return;
    const triggers = await this.prisma.whatsAppTrigger.findMany({
      where: {
        companyId: input.companyId,
        enabled: true,
        eventType: WhatsAppTriggerEvent.POST_SALE,
      },
    });
    for (const trigger of triggers) {
      if (trigger.matchStageId && trigger.matchStageId !== input.toStageId) {
        continue;
      }
      const lead = await this.prisma.lead.findUnique({
        where: { id: input.leadId },
      });
      if (!lead) continue;
      if (
        trigger.matchLabel &&
        !(await this.conversationHasLabel(phone, trigger.matchLabel))
      ) {
        continue;
      }
      await this.dispatchTrigger(trigger.id, phone, `lead:${input.leadId}:${input.toStageId}`, {
        ...this.leadVars(lead, input.toStageName),
      });
    }
  }

  async listFlows(companyId: string) {
    await this.ensureDefaultFlow(companyId);
    return this.prisma.whatsAppBotFlow.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createFlow(
    companyId: string,
    input: { name?: string; enabled?: boolean; definition?: unknown },
  ) {
    return this.prisma.whatsAppBotFlow.create({
      data: {
        companyId,
        name: input.name?.trim() || 'Fluxo de qualificação',
        enabled: input.enabled ?? true,
        definition: parseBotDefinition(
          input.definition ?? defaultWhatsAppBotDefinition(),
        ) as Prisma.InputJsonValue,
      },
    });
  }

  async updateFlow(
    companyId: string,
    id: string,
    input: { name?: string; enabled?: boolean; definition?: unknown },
  ) {
    await this.requireFlow(companyId, id);
    return this.prisma.whatsAppBotFlow.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.enabled != null ? { enabled: input.enabled } : {}),
        ...(input.definition != null
          ? {
              definition: parseBotDefinition(
                input.definition,
              ) as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }

  async deleteFlow(companyId: string, id: string) {
    await this.requireFlow(companyId, id);
    await this.prisma.whatsAppBotFlow.delete({ where: { id } });
  }

  async listBroadcasts(companyId: string) {
    return this.prisma.whatsAppBroadcast.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { recipients: true } },
      },
    });
  }

  async createBroadcast(
    companyId: string,
    input: {
      name?: string;
      body?: string | null;
      templateName?: string | null;
      templateLanguage?: string | null;
      matchLabel?: string | null;
      matchStageId?: string | null;
      matchSource?: string | null;
      matchLeadStatus?: string | null;
      scheduledAt?: string | null;
      ratePerMinute?: number;
    },
  ) {
    return this.prisma.whatsAppBroadcast.create({
      data: {
        companyId,
        name: input.name?.trim() || 'Campanha',
        body: input.body?.trim() || null,
        templateName: input.templateName?.trim() || null,
        templateLanguage: input.templateLanguage?.trim() || 'pt_BR',
        matchLabel: input.matchLabel?.trim() || null,
        matchStageId: input.matchStageId || null,
        matchSource: input.matchSource?.trim() || null,
        matchLeadStatus: input.matchLeadStatus?.trim() || null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        ratePerMinute: input.ratePerMinute ?? 20,
      },
    });
  }

  async updateBroadcast(
    companyId: string,
    id: string,
    input: Parameters<WhatsAppAutomationService['createBroadcast']>[1],
  ) {
    const row = await this.requireBroadcast(companyId, id);
    if (
      row.status !== WhatsAppBroadcastStatus.DRAFT &&
      row.status !== WhatsAppBroadcastStatus.SCHEDULED
    ) {
      throw new BadRequestException('Só é possível editar rascunhos ou agendadas');
    }
    return this.prisma.whatsAppBroadcast.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.body !== undefined ? { body: input.body?.trim() || null } : {}),
        ...(input.templateName !== undefined
          ? { templateName: input.templateName?.trim() || null }
          : {}),
        ...(input.templateLanguage !== undefined
          ? { templateLanguage: input.templateLanguage?.trim() || null }
          : {}),
        ...(input.matchLabel !== undefined
          ? { matchLabel: input.matchLabel?.trim() || null }
          : {}),
        ...(input.matchStageId !== undefined
          ? { matchStageId: input.matchStageId || null }
          : {}),
        ...(input.matchSource !== undefined
          ? { matchSource: input.matchSource?.trim() || null }
          : {}),
        ...(input.matchLeadStatus !== undefined
          ? { matchLeadStatus: input.matchLeadStatus?.trim() || null }
          : {}),
        ...(input.scheduledAt !== undefined
          ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null }
          : {}),
        ...(input.ratePerMinute != null
          ? { ratePerMinute: input.ratePerMinute }
          : {}),
      },
    });
  }

  async previewBroadcast(
    companyId: string,
    filters: {
      matchLabel?: string | null;
      matchStageId?: string | null;
      matchSource?: string | null;
      matchLeadStatus?: string | null;
    },
  ) {
    const phones = await this.resolveSegment(companyId, filters);
    return { count: phones.length, sample: phones.slice(0, 8) };
  }

  async startBroadcast(companyId: string, id: string) {
    const row = await this.requireBroadcast(companyId, id);
    if (
      row.status !== WhatsAppBroadcastStatus.DRAFT &&
      row.status !== WhatsAppBroadcastStatus.SCHEDULED &&
      row.status !== WhatsAppBroadcastStatus.PAUSED
    ) {
      throw new BadRequestException('Campanha não pode ser iniciada');
    }
    if (!row.body && !row.templateName) {
      throw new BadRequestException('Informe o texto ou um template');
    }

    if (row.status === WhatsAppBroadcastStatus.PAUSED) {
      return this.prisma.whatsAppBroadcast.update({
        where: { id },
        data: { status: WhatsAppBroadcastStatus.RUNNING },
      });
    }

    const phones = await this.resolveSegment(companyId, row);
    if (phones.length === 0) {
      throw new BadRequestException('Nenhum contato no segmento');
    }
    await this.prisma.whatsAppBroadcastRecipient.deleteMany({
      where: { broadcastId: id },
    });
    await this.prisma.whatsAppBroadcastRecipient.createMany({
      data: phones.map((phone) => ({ broadcastId: id, phone })),
    });

    const scheduled =
      row.scheduledAt && row.scheduledAt.getTime() > Date.now();
    return this.prisma.whatsAppBroadcast.update({
      where: { id },
      data: {
        status: scheduled
          ? WhatsAppBroadcastStatus.SCHEDULED
          : WhatsAppBroadcastStatus.RUNNING,
        startedAt: scheduled ? null : new Date(),
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        repliedCount: 0,
        failedCount: 0,
        finishedAt: null,
      },
    });
  }

  async pauseBroadcast(companyId: string, id: string) {
    const row = await this.requireBroadcast(companyId, id);
    if (row.status !== WhatsAppBroadcastStatus.RUNNING) {
      throw new BadRequestException('Só é possível pausar campanhas em execução');
    }
    return this.prisma.whatsAppBroadcast.update({
      where: { id },
      data: { status: WhatsAppBroadcastStatus.PAUSED },
    });
  }

  async deleteBroadcast(companyId: string, id: string) {
    const row = await this.requireBroadcast(companyId, id);
    if (
      row.status === WhatsAppBroadcastStatus.RUNNING ||
      row.status === WhatsAppBroadcastStatus.SCHEDULED
    ) {
      throw new BadRequestException('Pause ou aguarde a campanha terminar');
    }
    await this.prisma.whatsAppBroadcast.delete({ where: { id } });
  }

  async listTriggers(companyId: string) {
    return this.prisma.whatsAppTrigger.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTrigger(
    companyId: string,
    input: {
      name?: string;
      enabled?: boolean;
      eventType?: WhatsAppTriggerEvent;
      delayMinutes?: number;
      body?: string | null;
      templateName?: string | null;
      templateLanguage?: string | null;
      matchStageId?: string | null;
      matchLabel?: string | null;
    },
  ) {
    return this.prisma.whatsAppTrigger.create({
      data: {
        companyId,
        name: input.name?.trim() || 'Gatilho',
        enabled: input.enabled ?? true,
        eventType: input.eventType ?? WhatsAppTriggerEvent.CART_ABANDONED,
        delayMinutes: input.delayMinutes ?? 0,
        body: input.body?.trim() || null,
        templateName: input.templateName?.trim() || null,
        templateLanguage: input.templateLanguage?.trim() || 'pt_BR',
        matchStageId: input.matchStageId || null,
        matchLabel: input.matchLabel?.trim() || null,
      },
    });
  }

  async updateTrigger(
    companyId: string,
    id: string,
    input: Parameters<WhatsAppAutomationService['createTrigger']>[1],
  ) {
    await this.requireTrigger(companyId, id);
    return this.prisma.whatsAppTrigger.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.enabled != null ? { enabled: input.enabled } : {}),
        ...(input.eventType ? { eventType: input.eventType } : {}),
        ...(input.delayMinutes != null ? { delayMinutes: input.delayMinutes } : {}),
        ...(input.body !== undefined ? { body: input.body?.trim() || null } : {}),
        ...(input.templateName !== undefined
          ? { templateName: input.templateName?.trim() || null }
          : {}),
        ...(input.templateLanguage !== undefined
          ? { templateLanguage: input.templateLanguage?.trim() || null }
          : {}),
        ...(input.matchStageId !== undefined
          ? { matchStageId: input.matchStageId || null }
          : {}),
        ...(input.matchLabel !== undefined
          ? { matchLabel: input.matchLabel?.trim() || null }
          : {}),
      },
    });
  }

  async deleteTrigger(companyId: string, id: string) {
    await this.requireTrigger(companyId, id);
    await this.prisma.whatsAppTrigger.delete({ where: { id } });
  }

  async fireTriggerEvent(input: {
    companyId: string;
    eventType: WhatsAppTriggerEvent;
    phone: string;
    entityKey?: string;
    vars?: Record<string, string>;
  }) {
    const phone = normalizeWhatsAppPhone(input.phone);
    if (!phone) throw new BadRequestException('Telefone inválido');
    const triggers = await this.prisma.whatsAppTrigger.findMany({
      where: {
        companyId: input.companyId,
        enabled: true,
        eventType: input.eventType,
      },
    });
    const dayKey = new Date().toISOString().slice(0, 10);
    let sent = 0;
    for (const trigger of triggers) {
      const entityKey =
        input.entityKey?.trim() || `${phone}:${dayKey}:${trigger.id}`;
      const ok = await this.dispatchTrigger(
        trigger.id,
        phone,
        entityKey,
        input.vars ?? {},
      );
      if (ok) sent += 1;
    }
    return { matched: triggers.length, sent };
  }

  @Cron('* * * * *')
  async processScheduledJobs(): Promise<void> {
    await this.processBroadcasts();
    await this.processAppointmentTriggers();
    await this.processPixBoletoTriggers();
  }

  private async processBroadcasts(): Promise<void> {
    const due = await this.prisma.whatsAppBroadcast.findMany({
      where: {
        status: WhatsAppBroadcastStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
    });
    for (const row of due) {
      await this.prisma.whatsAppBroadcast.update({
        where: { id: row.id },
        data: { status: WhatsAppBroadcastStatus.RUNNING, startedAt: new Date() },
      });
    }

    const running = await this.prisma.whatsAppBroadcast.findMany({
      where: { status: WhatsAppBroadcastStatus.RUNNING },
    });
    for (const campaign of running) {
      const batch = await this.prisma.whatsAppBroadcastRecipient.findMany({
        where: {
          broadcastId: campaign.id,
          status: WhatsAppBroadcastRecipientStatus.PENDING,
        },
        take: Math.max(1, campaign.ratePerMinute),
        orderBy: { createdAt: 'asc' },
      });
      if (batch.length === 0) {
        await this.prisma.whatsAppBroadcast.update({
          where: { id: campaign.id },
          data: {
            status: WhatsAppBroadcastStatus.DONE,
            finishedAt: new Date(),
          },
        });
        continue;
      }
      for (const recipient of batch) {
        try {
          const sent = await this.sendAutomated(
            campaign.companyId,
            recipient.phone,
            {
              body: campaign.body,
              templateName: campaign.templateName,
              templateLanguage: campaign.templateLanguage,
            },
          );
          await this.prisma.whatsAppBroadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: WhatsAppBroadcastRecipientStatus.SENT,
              whatsappMessageId: sent.whatsappMessageId,
              sentAt: new Date(),
            },
          });
          await this.prisma.whatsAppBroadcast.update({
            where: { id: campaign.id },
            data: { sentCount: { increment: 1 } },
          });
        } catch (error) {
          await this.prisma.whatsAppBroadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              status: WhatsAppBroadcastRecipientStatus.FAILED,
              error: error instanceof Error ? error.message : 'Falha no envio',
            },
          });
          await this.prisma.whatsAppBroadcast.update({
            where: { id: campaign.id },
            data: { failedCount: { increment: 1 } },
          });
        }
      }
    }
  }

  private async processAppointmentTriggers(): Promise<void> {
    const triggers = await this.prisma.whatsAppTrigger.findMany({
      where: { enabled: true, eventType: WhatsAppTriggerEvent.APPOINTMENT },
    });
    const now = Date.now();
    for (const trigger of triggers) {
      const from = new Date(now + trigger.delayMinutes * 60_000 - 90_000);
      const to = new Date(now + trigger.delayMinutes * 60_000 + 90_000);
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          companyId: trigger.companyId,
          startAt: { gte: from, lte: to },
          client: { phone: { not: null } },
        },
        include: { client: { select: { phone: true, companyName: true, contactName: true } } },
        take: 80,
      });
      for (const event of events) {
        const phone = normalizeWhatsAppPhone(event.client?.phone ?? '');
        if (!phone) continue;
        await this.dispatchTrigger(trigger.id, phone, `event:${event.id}`, {
          nome: event.client?.contactName || event.client?.companyName || '',
          primeiro_nome: (event.client?.contactName || event.client?.companyName || '')
            .split(/\s+/)[0],
          evento: event.title,
          horario: event.startAt.toLocaleString('pt-BR'),
        });
      }
    }
  }

  private async processPixBoletoTriggers(): Promise<void> {
    const triggers = await this.prisma.whatsAppTrigger.findMany({
      where: { enabled: true, eventType: WhatsAppTriggerEvent.PIX_BOLETO },
    });
    const now = Date.now();
    for (const trigger of triggers) {
      const cutoff = new Date(now - trigger.delayMinutes * 60_000);
      const rows = await this.prisma.financialTransaction.findMany({
        where: {
          companyId: trigger.companyId,
          deletedAt: null,
          type: TransactionType.INCOME,
          status: {
            in: [TransactionStatus.PENDING, TransactionStatus.OVERDUE],
          },
          client: { phone: { not: null } },
          OR: [{ dueDate: { lte: cutoff } }, { dueDate: null, date: { lte: cutoff } }],
        },
        include: {
          client: { select: { phone: true, companyName: true, contactName: true } },
        },
        take: 80,
      });
      for (const row of rows) {
        const phone = normalizeWhatsAppPhone(row.client?.phone ?? '');
        if (!phone) continue;
        const amount = Number(row.amount).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        await this.dispatchTrigger(trigger.id, phone, `txn:${row.id}`, {
          nome: row.client?.contactName || row.client?.companyName || '',
          primeiro_nome: (row.client?.contactName || row.client?.companyName || '')
            .split(/\s+/)[0],
          valor: amount,
          titulo: row.title || row.description,
          vencimento: (row.dueDate ?? row.date).toLocaleDateString('pt-BR'),
        });
      }
    }
  }

  private async runBot(input: {
    companyId: string;
    phone: string;
    inbound: string;
    conversation: WhatsAppConversationSummary;
  }): Promise<boolean> {
    const flow = await this.prisma.whatsAppBotFlow.findFirst({
      where: { companyId: input.companyId, enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!flow) return false;

    const definition = parseBotDefinition(flow.definition);
    let session = await this.prisma.whatsAppBotSession.findUnique({
      where: {
        companyId_phone: { companyId: input.companyId, phone: input.phone },
      },
    });

    if (!session || session.status !== WhatsAppBotSessionStatus.ACTIVE) {
      session = await this.prisma.whatsAppBotSession.upsert({
        where: {
          companyId_phone: { companyId: input.companyId, phone: input.phone },
        },
        create: {
          companyId: input.companyId,
          phone: input.phone,
          flowId: flow.id,
          nodeId: definition.startId,
          waitingType: 'NONE',
          collected: {},
          status: WhatsAppBotSessionStatus.ACTIVE,
        },
        update: {
          flowId: flow.id,
          nodeId: definition.startId,
          waitingType: 'NONE',
          collected: {},
          status: WhatsAppBotSessionStatus.ACTIVE,
        },
      });
    }

    const collected = this.readCollected(session.collected);
    const vars = {
      ...this.leadVarsFromConversation(input.conversation),
      ...collected,
    };

    if (input.inbound && wantsHumanHandoff(input.inbound)) {
      const handoff =
        definition.nodes.find((node) => node.type === 'handoff') ?? {
          id: 'handoff',
          type: 'handoff' as const,
          text: 'Vou te transferir para um atendente.',
        };
      await this.executeHandoff(input, handoff, vars, session.id);
      return true;
    }

    let nodeId = session.nodeId;
    let waitingType = session.waitingType;
    let inbound = input.inbound;

    if (waitingType === 'MENU' && inbound) {
      const current = this.nodeById(definition, nodeId);
      const matched = this.matchMenu(current, inbound);
      if (!matched) {
        await this.sendAutomated(input.companyId, input.phone, {
          body: 'Não entendi. Toque em uma das opções ou responda com o número.',
        });
        return true;
      }
      nodeId = matched;
      waitingType = 'NONE';
      inbound = '';
    } else if (waitingType === 'QUESTION' && inbound) {
      const current = this.nodeById(definition, nodeId);
      const field = current?.field || 'resposta';
      collected[field] = inbound;
      vars[field] = inbound;
      nodeId = current?.nextId || '';
      waitingType = 'NONE';
      inbound = '';
    } else if (waitingType !== 'NONE') {
      return true;
    }

    let steps = 0;
    while (steps < 8) {
      steps += 1;
      const node = this.nodeById(definition, nodeId);
      if (!node) {
        await this.prisma.whatsAppBotSession.update({
          where: { id: session.id },
          data: { status: WhatsAppBotSessionStatus.STOPPED, waitingType: 'NONE' },
        });
        return true;
      }

      if (node.type === 'handoff') {
        await this.prisma.whatsAppBotSession.update({
          where: { id: session.id },
          data: {
            nodeId: node.id,
            collected: collected as Prisma.InputJsonValue,
            waitingType: 'NONE',
          },
        });
        await this.executeHandoff(input, node, vars, session.id);
        return true;
      }

      if (node.type === 'menu') {
        const prompt = interpolateTemplate(
          node.text || 'Escolha uma opção:',
          vars,
        );
        const options = (node.options ?? []).filter(
          (option) => option.key && option.label,
        );
        if (options.length > 0) {
          try {
            await this.whatsApp.sendInteractiveMenu(
              input.phone,
              prompt,
              options.map((option) => ({
                id: option.key,
                title: option.label,
              })),
              undefined,
              false,
            );
          } catch (error) {
            this.logger.warn(
              `Interactive menu failed, falling back to text: ${
                error instanceof Error ? error.message : error
              }`,
            );
            const lines = [
              prompt,
              ...options.map((option) => `${option.key}. ${option.label}`),
            ];
            await this.sendAutomated(input.companyId, input.phone, {
              body: lines.join('\n'),
            });
          }
        } else {
          await this.sendAutomated(input.companyId, input.phone, {
            body: prompt,
          });
        }
        await this.prisma.whatsAppBotSession.update({
          where: { id: session.id },
          data: {
            nodeId: node.id,
            waitingType: 'MENU',
            collected: collected as Prisma.InputJsonValue,
          },
        });
        return true;
      }

      if (node.type === 'question') {
        await this.sendAutomated(input.companyId, input.phone, {
          body: interpolateTemplate(node.text || 'Pode me contar mais?', vars),
        });
        await this.prisma.whatsAppBotSession.update({
          where: { id: session.id },
          data: {
            nodeId: node.id,
            waitingType: 'QUESTION',
            collected: collected as Prisma.InputJsonValue,
          },
        });
        return true;
      }

      if (node.type === 'ai') {
        if (node.text) {
          await this.sendAutomated(input.companyId, input.phone, {
            body: interpolateTemplate(node.text, vars),
          });
        }
        const reply = await this.ai.replyWhatsApp({
          inbound: input.inbound || collected.necessidade || 'Olá',
          leadName: vars.nome || input.conversation.name,
          collected,
        });
        if (reply) {
          await this.sendAutomated(input.companyId, input.phone, { body: reply });
        }
        await this.qualifyQuietly(input.companyId, input.conversation, input.phone);
        nodeId = node.nextId || '';
        continue;
      }

      if (node.text) {
        await this.sendAutomated(input.companyId, input.phone, {
          body: interpolateTemplate(node.text, vars),
        });
      }
      nodeId = node.nextId || '';
    }

    await this.prisma.whatsAppBotSession.update({
      where: { id: session.id },
      data: {
        nodeId,
        waitingType,
        collected: collected as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  private async executeHandoff(
    input: {
      companyId: string;
      phone: string;
      conversation: WhatsAppConversationSummary;
    },
    node: WhatsAppBotNode,
    vars: Record<string, string>,
    sessionId: string,
  ) {
    if (node.text) {
      await this.sendAutomated(input.companyId, input.phone, {
        body: interpolateTemplate(node.text, vars),
      });
    }
    await this.prisma.whatsAppBotSession.update({
      where: { id: sessionId },
      data: { status: WhatsAppBotSessionStatus.HANDED_OFF, waitingType: 'NONE' },
    });
    await this.routing.assignIncoming(input.conversation, input.companyId);
  }

  private async replyWithAi(input: {
    companyId: string;
    phone: string;
    inbound: string;
    conversation: WhatsAppConversationSummary;
  }) {
    try {
      const reply = await this.ai.replyWhatsApp({
        inbound: input.inbound,
        leadName: input.conversation.name || input.conversation.lead?.name,
      });
      if (reply) {
        await this.sendAutomated(input.companyId, input.phone, { body: reply });
      }
      await this.qualifyQuietly(input.companyId, input.conversation, input.phone);
    } catch (error) {
      this.logger.warn(
        `AI auto-reply failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async qualifyQuietly(
    companyId: string,
    conversation: WhatsAppConversationSummary,
    phone: string,
  ) {
    const lead = conversation.lead;
    if (!lead) return;
    try {
      const result = await this.ai.qualifyLead({
        name: lead.name,
        phone,
      });
      await this.prisma.whatsAppCrmEvent.create({
        data: {
          companyId,
          leadId: lead.id,
          phone,
          type: WhatsAppCrmEventType.AUTO_MESSAGE,
          title: `IA · score ${result.score}${result.qualified ? ' · qualificado' : ''}`,
          body: result.notes,
        },
      });
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { aiScore: result.score, aiNotes: result.notes },
      });
    } catch (error) {
      this.logger.warn(
        `Predictive qualify failed: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async sendAutomated(
    companyId: string,
    phone: string,
    content: {
      body?: string | null;
      templateName?: string | null;
      templateLanguage?: string | null;
      vars?: Record<string, string>;
    },
  ) {
    const vars = content.vars ?? {};
    if (content.templateName) {
      const language = content.templateLanguage || 'pt_BR';
      const parameters = extractPlaceholders(content.body || '', vars);
      return this.whatsApp.sendTemplate(
        phone,
        content.templateName,
        language,
        parameters,
        undefined,
        false,
      );
    }
    const body = interpolateTemplate(content.body || '', vars).trim();
    if (!body) {
      throw new BadRequestException('Mensagem vazia');
    }
    return this.whatsApp.send(phone, body, undefined, false);
  }

  private async dispatchTrigger(
    triggerId: string,
    phone: string,
    entityKey: string,
    vars: Record<string, string>,
  ): Promise<boolean> {
    const trigger = await this.prisma.whatsAppTrigger.findUnique({
      where: { id: triggerId },
    });
    if (!trigger?.enabled || (!trigger.body && !trigger.templateName)) {
      return false;
    }
    const existing = await this.prisma.whatsAppTriggerDispatch.findUnique({
      where: { triggerId_entityKey: { triggerId, entityKey } },
    });
    if (existing) return false;
    try {
      await this.sendAutomated(trigger.companyId, phone, {
        body: trigger.body,
        templateName: trigger.templateName,
        templateLanguage: trigger.templateLanguage,
        vars,
      });
      await this.prisma.whatsAppTriggerDispatch.create({
        data: { triggerId, phone, entityKey },
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Trigger ${trigger.name} failed for ${phone}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return false;
    }
  }

  private async resolveSegment(
    companyId: string,
    filters: {
      matchLabel?: string | null;
      matchStageId?: string | null;
      matchSource?: string | null;
      matchLeadStatus?: string | null;
    },
  ): Promise<string[]> {
    const conversations = await this.prisma.whatsAppConversation.findMany({
      where: {
        status: { not: WhatsAppConversationStatus.RESOLVED },
        ...(filters.matchLabel
          ? { labels: { has: filters.matchLabel } }
          : {}),
      },
    });
    const summaries: WhatsAppConversationSummary[] = conversations.map((row) => ({
      id: row.id,
      phone: row.phone,
      name: row.name,
      status: row.status as WhatsAppConversationSummary['status'],
      priority: row.priority as WhatsAppConversationSummary['priority'],
      labels: row.labels,
      unreadCount: row.unreadCount,
      lastMessage: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      direction: null,
      lastMessageStatus: null,
      assignedUser: null,
      queuedAt: row.queuedAt,
      assignedAt: row.assignedAt,
      lastAgentReplyAt: row.lastAgentReplyAt,
      waitingSeconds: 0,
      slaBreached: false,
      needsAgentReply: false,
      lead: null,
    }));
    const withLeads = await this.routing.attachLeads(summaries, companyId);
    const phones = new Set<string>();
    for (const item of withLeads) {
      if (filters.matchStageId && item.lead?.stageId !== filters.matchStageId) {
        continue;
      }
      if (
        filters.matchSource &&
        item.lead?.source?.toLowerCase() !== filters.matchSource.toLowerCase()
      ) {
        continue;
      }
      if (
        filters.matchLeadStatus &&
        item.lead?.status !== filters.matchLeadStatus
      ) {
        continue;
      }
      phones.add(normalizeWhatsAppPhone(item.phone));
    }
    return [...phones].filter(Boolean);
  }

  private async markBroadcastReplies(phone: string) {
    const pending = await this.prisma.whatsAppBroadcastRecipient.findMany({
      where: {
        phone,
        status: {
          in: [
            WhatsAppBroadcastRecipientStatus.SENT,
            WhatsAppBroadcastRecipientStatus.DELIVERED,
            WhatsAppBroadcastRecipientStatus.READ,
          ],
        },
        sentAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    });
    for (const row of pending) {
      await this.prisma.whatsAppBroadcastRecipient.update({
        where: { id: row.id },
        data: { status: WhatsAppBroadcastRecipientStatus.REPLIED },
      });
      await this.prisma.whatsAppBroadcast.update({
        where: { id: row.broadcastId },
        data: { repliedCount: { increment: 1 } },
      });
    }
  }

  private async conversationHasLabel(phone: string, label: string) {
    const row = await this.prisma.whatsAppConversation.findFirst({
      where: { phone },
      select: { labels: true },
    });
    return row?.labels.includes(label) ?? false;
  }

  private async ensureDefaultFlow(companyId: string) {
    const count = await this.prisma.whatsAppBotFlow.count({ where: { companyId } });
    if (count > 0) return;
    await this.prisma.whatsAppBotFlow.create({
      data: {
        companyId,
        name: 'Qualificação inicial',
        enabled: true,
        definition: defaultWhatsAppBotDefinition() as Prisma.InputJsonValue,
      },
    });
  }

  private async requireFlow(companyId: string, id: string) {
    const row = await this.prisma.whatsAppBotFlow.findFirst({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Fluxo não encontrado');
    return row;
  }

  private async requireBroadcast(companyId: string, id: string) {
    const row = await this.prisma.whatsAppBroadcast.findFirst({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Campanha não encontrada');
    return row;
  }

  private async requireTrigger(companyId: string, id: string) {
    const row = await this.prisma.whatsAppTrigger.findFirst({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException('Gatilho não encontrado');
    return row;
  }

  private nodeById(definition: WhatsAppBotDefinition, id: string) {
    return definition.nodes.find((node) => node.id === id) ?? null;
  }

  private matchMenu(node: WhatsAppBotNode | null, inbound: string): string | null {
    if (!node?.options?.length) return null;
    const text = inbound.trim().toLowerCase();
    const byKey = node.options.find(
      (option) => option.key.toLowerCase() === text || text === option.key,
    );
    if (byKey?.nextId) return byKey.nextId;
    const byLabel = node.options.find((option) =>
      option.label.toLowerCase().includes(text) ||
      text.includes(option.label.toLowerCase()),
    );
    if (byLabel?.nextId) return byLabel.nextId;
    const numeric = text.replace(/\D/g, '');
    const byIndex = node.options.find((option) => option.key === numeric);
    return byIndex?.nextId ?? null;
  }

  private readCollected(value: Prisma.JsonValue): Collected {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Collected = {};
    for (const [key, item] of Object.entries(value)) {
      if (item != null) out[key] = String(item);
    }
    return out;
  }

  private leadVarsFromConversation(conversation: WhatsAppConversationSummary) {
    const name = conversation.lead?.name || conversation.name || '';
    return {
      nome: name,
      primeiro_nome: name.trim().split(/\s+/)[0] || '',
      etapa: conversation.lead?.stageName ?? '',
      origem: conversation.lead?.source ?? '',
    };
  }

  private leadVars(
    lead: { name: string; contactName: string | null; source: string },
    stageName: string,
  ) {
    const name = lead.contactName || lead.name;
    return {
      nome: name,
      primeiro_nome: name.trim().split(/\s+/)[0] || name,
      etapa: stageName,
      origem: lead.source,
    };
  }
}
