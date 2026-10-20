"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsAppAutomationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAutomationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const ai_service_1 = require("../../ai/ai.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const whatsapp_bot_flow_1 = require("../domain/whatsapp-bot-flow");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_routing_service_1 = require("./whatsapp-routing.service");
const whatsapp_service_1 = require("./whatsapp.service");
const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';
let WhatsAppAutomationService = WhatsAppAutomationService_1 = class WhatsAppAutomationService {
    prisma;
    whatsApp;
    routing;
    ai;
    logger = new common_1.Logger(WhatsAppAutomationService_1.name);
    constructor(prisma, whatsApp, routing, ai) {
        this.prisma = prisma;
        this.whatsApp = whatsApp;
        this.routing = routing;
        this.ai = ai;
    }
    async handleInbound(input) {
        const companyId = input.companyId ?? DEFAULT_COMPANY;
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone);
        const body = (input.body || '').trim();
        if (!phone)
            return;
        await this.markBroadcastReplies(phone);
        if (input.conversation.assignedUser) {
            return;
        }
        const settings = await this.routing.getSettings(companyId);
        const session = await this.prisma.whatsAppBotSession.findUnique({
            where: { companyId_phone: { companyId, phone } },
        });
        const botActive = session?.status === client_1.WhatsAppBotSessionStatus.ACTIVE ||
            (settings.botEnabled && !session);
        if (botActive) {
            const handled = await this.runBot({
                companyId,
                phone,
                inbound: body,
                conversation: input.conversation,
            });
            if (handled)
                return;
        }
        await this.routing.assignIncoming(input.conversation, companyId);
        const afterAssign = await this.prisma.whatsAppConversation.findFirst({
            where: { phone },
            select: { assignedUserId: true },
        });
        if (afterAssign?.assignedUserId)
            return;
        if (!settings.aiAutoReply || !body)
            return;
        await this.replyWithAi({
            companyId,
            phone,
            inbound: body,
            conversation: input.conversation,
        });
    }
    async onMessageStatus(whatsappMessageId, status) {
        const mapped = status === whatsapp_message_1.WhatsAppStatus.DELIVERED
            ? client_1.WhatsAppBroadcastRecipientStatus.DELIVERED
            : status === whatsapp_message_1.WhatsAppStatus.READ
                ? client_1.WhatsAppBroadcastRecipientStatus.READ
                : status === whatsapp_message_1.WhatsAppStatus.FAILED
                    ? client_1.WhatsAppBroadcastRecipientStatus.FAILED
                    : null;
        if (!mapped)
            return;
        const recipient = await this.prisma.whatsAppBroadcastRecipient.findFirst({
            where: { whatsappMessageId },
        });
        if (!recipient)
            return;
        if (recipient.status === client_1.WhatsAppBroadcastRecipientStatus.REPLIED ||
            recipient.status === client_1.WhatsAppBroadcastRecipientStatus.FAILED) {
            return;
        }
        if (recipient.status === client_1.WhatsAppBroadcastRecipientStatus.READ &&
            mapped !== client_1.WhatsAppBroadcastRecipientStatus.FAILED) {
            return;
        }
        await this.prisma.whatsAppBroadcastRecipient.update({
            where: { id: recipient.id },
            data: { status: mapped },
        });
        const increment = mapped === client_1.WhatsAppBroadcastRecipientStatus.DELIVERED
            ? { deliveredCount: { increment: 1 } }
            : mapped === client_1.WhatsAppBroadcastRecipientStatus.READ
                ? { readCount: { increment: 1 } }
                : { failedCount: { increment: 1 } };
        await this.prisma.whatsAppBroadcast.update({
            where: { id: recipient.broadcastId },
            data: increment,
        });
    }
    async onStageMove(input) {
        const phone = input.phone ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone) : '';
        if (!phone)
            return;
        const triggers = await this.prisma.whatsAppTrigger.findMany({
            where: {
                companyId: input.companyId,
                enabled: true,
                eventType: client_1.WhatsAppTriggerEvent.POST_SALE,
            },
        });
        for (const trigger of triggers) {
            if (trigger.matchStageId && trigger.matchStageId !== input.toStageId) {
                continue;
            }
            const lead = await this.prisma.lead.findUnique({
                where: { id: input.leadId },
            });
            if (!lead)
                continue;
            if (trigger.matchLabel &&
                !(await this.conversationHasLabel(phone, trigger.matchLabel))) {
                continue;
            }
            await this.dispatchTrigger(trigger.id, phone, `lead:${input.leadId}:${input.toStageId}`, {
                ...this.leadVars(lead, input.toStageName),
            });
        }
    }
    async listFlows(companyId) {
        await this.ensureDefaultFlow(companyId);
        return this.prisma.whatsAppBotFlow.findMany({
            where: { companyId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createFlow(companyId, input) {
        return this.prisma.whatsAppBotFlow.create({
            data: {
                companyId,
                name: input.name?.trim() || 'Fluxo de qualificação',
                enabled: input.enabled ?? true,
                definition: (0, whatsapp_bot_flow_1.parseBotDefinition)(input.definition ?? (0, whatsapp_bot_flow_1.defaultWhatsAppBotDefinition)()),
            },
        });
    }
    async updateFlow(companyId, id, input) {
        await this.requireFlow(companyId, id);
        return this.prisma.whatsAppBotFlow.update({
            where: { id },
            data: {
                ...(input.name != null ? { name: input.name.trim() } : {}),
                ...(input.enabled != null ? { enabled: input.enabled } : {}),
                ...(input.definition != null
                    ? {
                        definition: (0, whatsapp_bot_flow_1.parseBotDefinition)(input.definition),
                    }
                    : {}),
            },
        });
    }
    async deleteFlow(companyId, id) {
        await this.requireFlow(companyId, id);
        await this.prisma.whatsAppBotFlow.delete({ where: { id } });
    }
    async listBroadcasts(companyId) {
        return this.prisma.whatsAppBroadcast.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { recipients: true } },
            },
        });
    }
    async createBroadcast(companyId, input) {
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
    async updateBroadcast(companyId, id, input) {
        const row = await this.requireBroadcast(companyId, id);
        if (row.status !== client_1.WhatsAppBroadcastStatus.DRAFT &&
            row.status !== client_1.WhatsAppBroadcastStatus.SCHEDULED) {
            throw new common_1.BadRequestException('Só é possível editar rascunhos ou agendadas');
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
    async previewBroadcast(companyId, filters) {
        const phones = await this.resolveSegment(companyId, filters);
        return { count: phones.length, sample: phones.slice(0, 8) };
    }
    async startBroadcast(companyId, id) {
        const row = await this.requireBroadcast(companyId, id);
        if (row.status !== client_1.WhatsAppBroadcastStatus.DRAFT &&
            row.status !== client_1.WhatsAppBroadcastStatus.SCHEDULED &&
            row.status !== client_1.WhatsAppBroadcastStatus.PAUSED) {
            throw new common_1.BadRequestException('Campanha não pode ser iniciada');
        }
        if (!row.body && !row.templateName) {
            throw new common_1.BadRequestException('Informe o texto ou um template');
        }
        if (row.status === client_1.WhatsAppBroadcastStatus.PAUSED) {
            return this.prisma.whatsAppBroadcast.update({
                where: { id },
                data: { status: client_1.WhatsAppBroadcastStatus.RUNNING },
            });
        }
        const phones = await this.resolveSegment(companyId, row);
        if (phones.length === 0) {
            throw new common_1.BadRequestException('Nenhum contato no segmento');
        }
        await this.prisma.whatsAppBroadcastRecipient.deleteMany({
            where: { broadcastId: id },
        });
        await this.prisma.whatsAppBroadcastRecipient.createMany({
            data: phones.map((phone) => ({ broadcastId: id, phone })),
        });
        const scheduled = row.scheduledAt && row.scheduledAt.getTime() > Date.now();
        return this.prisma.whatsAppBroadcast.update({
            where: { id },
            data: {
                status: scheduled
                    ? client_1.WhatsAppBroadcastStatus.SCHEDULED
                    : client_1.WhatsAppBroadcastStatus.RUNNING,
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
    async pauseBroadcast(companyId, id) {
        const row = await this.requireBroadcast(companyId, id);
        if (row.status !== client_1.WhatsAppBroadcastStatus.RUNNING) {
            throw new common_1.BadRequestException('Só é possível pausar campanhas em execução');
        }
        return this.prisma.whatsAppBroadcast.update({
            where: { id },
            data: { status: client_1.WhatsAppBroadcastStatus.PAUSED },
        });
    }
    async deleteBroadcast(companyId, id) {
        const row = await this.requireBroadcast(companyId, id);
        if (row.status === client_1.WhatsAppBroadcastStatus.RUNNING ||
            row.status === client_1.WhatsAppBroadcastStatus.SCHEDULED) {
            throw new common_1.BadRequestException('Pause ou aguarde a campanha terminar');
        }
        await this.prisma.whatsAppBroadcast.delete({ where: { id } });
    }
    async listTriggers(companyId) {
        return this.prisma.whatsAppTrigger.findMany({
            where: { companyId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createTrigger(companyId, input) {
        return this.prisma.whatsAppTrigger.create({
            data: {
                companyId,
                name: input.name?.trim() || 'Gatilho',
                enabled: input.enabled ?? true,
                eventType: input.eventType ?? client_1.WhatsAppTriggerEvent.CART_ABANDONED,
                delayMinutes: input.delayMinutes ?? 0,
                body: input.body?.trim() || null,
                templateName: input.templateName?.trim() || null,
                templateLanguage: input.templateLanguage?.trim() || 'pt_BR',
                matchStageId: input.matchStageId || null,
                matchLabel: input.matchLabel?.trim() || null,
            },
        });
    }
    async updateTrigger(companyId, id, input) {
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
    async deleteTrigger(companyId, id) {
        await this.requireTrigger(companyId, id);
        await this.prisma.whatsAppTrigger.delete({ where: { id } });
    }
    async fireTriggerEvent(input) {
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone);
        if (!phone)
            throw new common_1.BadRequestException('Telefone inválido');
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
            const entityKey = input.entityKey?.trim() || `${phone}:${dayKey}:${trigger.id}`;
            const ok = await this.dispatchTrigger(trigger.id, phone, entityKey, input.vars ?? {});
            if (ok)
                sent += 1;
        }
        return { matched: triggers.length, sent };
    }
    async processScheduledJobs() {
        await this.processBroadcasts();
        await this.processAppointmentTriggers();
        await this.processPixBoletoTriggers();
    }
    async processBroadcasts() {
        const due = await this.prisma.whatsAppBroadcast.findMany({
            where: {
                status: client_1.WhatsAppBroadcastStatus.SCHEDULED,
                scheduledAt: { lte: new Date() },
            },
        });
        for (const row of due) {
            await this.prisma.whatsAppBroadcast.update({
                where: { id: row.id },
                data: { status: client_1.WhatsAppBroadcastStatus.RUNNING, startedAt: new Date() },
            });
        }
        const running = await this.prisma.whatsAppBroadcast.findMany({
            where: { status: client_1.WhatsAppBroadcastStatus.RUNNING },
        });
        for (const campaign of running) {
            const batch = await this.prisma.whatsAppBroadcastRecipient.findMany({
                where: {
                    broadcastId: campaign.id,
                    status: client_1.WhatsAppBroadcastRecipientStatus.PENDING,
                },
                take: Math.max(1, campaign.ratePerMinute),
                orderBy: { createdAt: 'asc' },
            });
            if (batch.length === 0) {
                await this.prisma.whatsAppBroadcast.update({
                    where: { id: campaign.id },
                    data: {
                        status: client_1.WhatsAppBroadcastStatus.DONE,
                        finishedAt: new Date(),
                    },
                });
                continue;
            }
            for (const recipient of batch) {
                try {
                    const sent = await this.sendAutomated(campaign.companyId, recipient.phone, {
                        body: campaign.body,
                        templateName: campaign.templateName,
                        templateLanguage: campaign.templateLanguage,
                    });
                    await this.prisma.whatsAppBroadcastRecipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: client_1.WhatsAppBroadcastRecipientStatus.SENT,
                            whatsappMessageId: sent.whatsappMessageId,
                            sentAt: new Date(),
                        },
                    });
                    await this.prisma.whatsAppBroadcast.update({
                        where: { id: campaign.id },
                        data: { sentCount: { increment: 1 } },
                    });
                }
                catch (error) {
                    await this.prisma.whatsAppBroadcastRecipient.update({
                        where: { id: recipient.id },
                        data: {
                            status: client_1.WhatsAppBroadcastRecipientStatus.FAILED,
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
    async processAppointmentTriggers() {
        const triggers = await this.prisma.whatsAppTrigger.findMany({
            where: { enabled: true, eventType: client_1.WhatsAppTriggerEvent.APPOINTMENT },
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
                const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(event.client?.phone ?? '');
                if (!phone)
                    continue;
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
    async processPixBoletoTriggers() {
        const triggers = await this.prisma.whatsAppTrigger.findMany({
            where: { enabled: true, eventType: client_1.WhatsAppTriggerEvent.PIX_BOLETO },
        });
        const now = Date.now();
        for (const trigger of triggers) {
            const cutoff = new Date(now - trigger.delayMinutes * 60_000);
            const rows = await this.prisma.financialTransaction.findMany({
                where: {
                    companyId: trigger.companyId,
                    deletedAt: null,
                    type: client_1.TransactionType.INCOME,
                    status: {
                        in: [client_1.TransactionStatus.PENDING, client_1.TransactionStatus.OVERDUE],
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
                const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(row.client?.phone ?? '');
                if (!phone)
                    continue;
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
    async runBot(input) {
        const flow = await this.prisma.whatsAppBotFlow.findFirst({
            where: { companyId: input.companyId, enabled: true },
            orderBy: { createdAt: 'asc' },
        });
        if (!flow)
            return false;
        const definition = (0, whatsapp_bot_flow_1.parseBotDefinition)(flow.definition);
        let session = await this.prisma.whatsAppBotSession.findUnique({
            where: {
                companyId_phone: { companyId: input.companyId, phone: input.phone },
            },
        });
        if (!session || session.status !== client_1.WhatsAppBotSessionStatus.ACTIVE) {
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
                    status: client_1.WhatsAppBotSessionStatus.ACTIVE,
                },
                update: {
                    flowId: flow.id,
                    nodeId: definition.startId,
                    waitingType: 'NONE',
                    collected: {},
                    status: client_1.WhatsAppBotSessionStatus.ACTIVE,
                },
            });
        }
        const collected = this.readCollected(session.collected);
        const vars = {
            ...this.leadVarsFromConversation(input.conversation),
            ...collected,
        };
        if (input.inbound && (0, whatsapp_bot_flow_1.wantsHumanHandoff)(input.inbound)) {
            const handoff = definition.nodes.find((node) => node.type === 'handoff') ?? {
                id: 'handoff',
                type: 'handoff',
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
        }
        else if (waitingType === 'QUESTION' && inbound) {
            const current = this.nodeById(definition, nodeId);
            const field = current?.field || 'resposta';
            collected[field] = inbound;
            vars[field] = inbound;
            nodeId = current?.nextId || '';
            waitingType = 'NONE';
            inbound = '';
        }
        else if (waitingType !== 'NONE') {
            return true;
        }
        let steps = 0;
        while (steps < 8) {
            steps += 1;
            const node = this.nodeById(definition, nodeId);
            if (!node) {
                await this.prisma.whatsAppBotSession.update({
                    where: { id: session.id },
                    data: { status: client_1.WhatsAppBotSessionStatus.STOPPED, waitingType: 'NONE' },
                });
                return true;
            }
            if (node.type === 'handoff') {
                await this.prisma.whatsAppBotSession.update({
                    where: { id: session.id },
                    data: {
                        nodeId: node.id,
                        collected: collected,
                        waitingType: 'NONE',
                    },
                });
                await this.executeHandoff(input, node, vars, session.id);
                return true;
            }
            if (node.type === 'menu') {
                const prompt = (0, whatsapp_bot_flow_1.interpolateTemplate)(node.text || 'Escolha uma opção:', vars);
                const options = (node.options ?? []).filter((option) => option.key && option.label);
                if (options.length > 0) {
                    try {
                        await this.whatsApp.sendInteractiveMenu(input.phone, prompt, options.map((option) => ({
                            id: option.key,
                            title: option.label,
                        })), undefined, false);
                    }
                    catch (error) {
                        this.logger.warn(`Interactive menu failed, falling back to text: ${error instanceof Error ? error.message : error}`);
                        const lines = [
                            prompt,
                            ...options.map((option) => `${option.key}. ${option.label}`),
                        ];
                        await this.sendAutomated(input.companyId, input.phone, {
                            body: lines.join('\n'),
                        });
                    }
                }
                else {
                    await this.sendAutomated(input.companyId, input.phone, {
                        body: prompt,
                    });
                }
                await this.prisma.whatsAppBotSession.update({
                    where: { id: session.id },
                    data: {
                        nodeId: node.id,
                        waitingType: 'MENU',
                        collected: collected,
                    },
                });
                return true;
            }
            if (node.type === 'question') {
                await this.sendAutomated(input.companyId, input.phone, {
                    body: (0, whatsapp_bot_flow_1.interpolateTemplate)(node.text || 'Pode me contar mais?', vars),
                });
                await this.prisma.whatsAppBotSession.update({
                    where: { id: session.id },
                    data: {
                        nodeId: node.id,
                        waitingType: 'QUESTION',
                        collected: collected,
                    },
                });
                return true;
            }
            if (node.type === 'ai') {
                if (node.text) {
                    await this.sendAutomated(input.companyId, input.phone, {
                        body: (0, whatsapp_bot_flow_1.interpolateTemplate)(node.text, vars),
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
                    body: (0, whatsapp_bot_flow_1.interpolateTemplate)(node.text, vars),
                });
            }
            nodeId = node.nextId || '';
        }
        await this.prisma.whatsAppBotSession.update({
            where: { id: session.id },
            data: {
                nodeId,
                waitingType,
                collected: collected,
            },
        });
        return true;
    }
    async executeHandoff(input, node, vars, sessionId) {
        if (node.text) {
            await this.sendAutomated(input.companyId, input.phone, {
                body: (0, whatsapp_bot_flow_1.interpolateTemplate)(node.text, vars),
            });
        }
        await this.prisma.whatsAppBotSession.update({
            where: { id: sessionId },
            data: { status: client_1.WhatsAppBotSessionStatus.HANDED_OFF, waitingType: 'NONE' },
        });
        await this.routing.assignIncoming(input.conversation, input.companyId);
    }
    async replyWithAi(input) {
        try {
            const reply = await this.ai.replyWhatsApp({
                inbound: input.inbound,
                leadName: input.conversation.name || input.conversation.lead?.name,
            });
            if (reply) {
                await this.sendAutomated(input.companyId, input.phone, { body: reply });
            }
            await this.qualifyQuietly(input.companyId, input.conversation, input.phone);
        }
        catch (error) {
            this.logger.warn(`AI auto-reply failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    async qualifyQuietly(companyId, conversation, phone) {
        const lead = conversation.lead;
        if (!lead)
            return;
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
                    type: client_1.WhatsAppCrmEventType.AUTO_MESSAGE,
                    title: `IA · score ${result.score}${result.qualified ? ' · qualificado' : ''}`,
                    body: result.notes,
                },
            });
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: { aiScore: result.score, aiNotes: result.notes },
            });
        }
        catch (error) {
            this.logger.warn(`Predictive qualify failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    async sendAutomated(companyId, phone, content) {
        const vars = content.vars ?? {};
        if (content.templateName) {
            const language = content.templateLanguage || 'pt_BR';
            const parameters = (0, whatsapp_bot_flow_1.extractPlaceholders)(content.body || '', vars);
            return this.whatsApp.sendTemplate(phone, content.templateName, language, parameters, undefined, false);
        }
        const body = (0, whatsapp_bot_flow_1.interpolateTemplate)(content.body || '', vars).trim();
        if (!body) {
            throw new common_1.BadRequestException('Mensagem vazia');
        }
        return this.whatsApp.send(phone, body, undefined, false);
    }
    async dispatchTrigger(triggerId, phone, entityKey, vars) {
        const trigger = await this.prisma.whatsAppTrigger.findUnique({
            where: { id: triggerId },
        });
        if (!trigger?.enabled || (!trigger.body && !trigger.templateName)) {
            return false;
        }
        const existing = await this.prisma.whatsAppTriggerDispatch.findUnique({
            where: { triggerId_entityKey: { triggerId, entityKey } },
        });
        if (existing)
            return false;
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
        }
        catch (error) {
            this.logger.warn(`Trigger ${trigger.name} failed for ${phone}: ${error instanceof Error ? error.message : error}`);
            return false;
        }
    }
    async resolveSegment(companyId, filters) {
        const conversations = await this.prisma.whatsAppConversation.findMany({
            where: {
                status: { not: client_1.WhatsAppConversationStatus.RESOLVED },
                ...(filters.matchLabel
                    ? { labels: { has: filters.matchLabel } }
                    : {}),
            },
        });
        const summaries = conversations.map((row) => ({
            id: row.id,
            phone: row.phone,
            name: row.name,
            status: row.status,
            priority: row.priority,
            labels: row.labels,
            unreadCount: row.unreadCount,
            lastMessage: row.lastMessagePreview,
            lastMessageAt: row.lastMessageAt,
            direction: null,
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
        const phones = new Set();
        for (const item of withLeads) {
            if (filters.matchStageId && item.lead?.stageId !== filters.matchStageId) {
                continue;
            }
            if (filters.matchSource &&
                item.lead?.source?.toLowerCase() !== filters.matchSource.toLowerCase()) {
                continue;
            }
            if (filters.matchLeadStatus &&
                item.lead?.status !== filters.matchLeadStatus) {
                continue;
            }
            phones.add((0, whatsapp_phone_1.normalizeWhatsAppPhone)(item.phone));
        }
        return [...phones].filter(Boolean);
    }
    async markBroadcastReplies(phone) {
        const pending = await this.prisma.whatsAppBroadcastRecipient.findMany({
            where: {
                phone,
                status: {
                    in: [
                        client_1.WhatsAppBroadcastRecipientStatus.SENT,
                        client_1.WhatsAppBroadcastRecipientStatus.DELIVERED,
                        client_1.WhatsAppBroadcastRecipientStatus.READ,
                    ],
                },
                sentAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
            },
        });
        for (const row of pending) {
            await this.prisma.whatsAppBroadcastRecipient.update({
                where: { id: row.id },
                data: { status: client_1.WhatsAppBroadcastRecipientStatus.REPLIED },
            });
            await this.prisma.whatsAppBroadcast.update({
                where: { id: row.broadcastId },
                data: { repliedCount: { increment: 1 } },
            });
        }
    }
    async conversationHasLabel(phone, label) {
        const row = await this.prisma.whatsAppConversation.findFirst({
            where: { phone },
            select: { labels: true },
        });
        return row?.labels.includes(label) ?? false;
    }
    async ensureDefaultFlow(companyId) {
        const count = await this.prisma.whatsAppBotFlow.count({ where: { companyId } });
        if (count > 0)
            return;
        await this.prisma.whatsAppBotFlow.create({
            data: {
                companyId,
                name: 'Qualificação inicial',
                enabled: true,
                definition: (0, whatsapp_bot_flow_1.defaultWhatsAppBotDefinition)(),
            },
        });
    }
    async requireFlow(companyId, id) {
        const row = await this.prisma.whatsAppBotFlow.findFirst({
            where: { id, companyId },
        });
        if (!row)
            throw new common_1.NotFoundException('Fluxo não encontrado');
        return row;
    }
    async requireBroadcast(companyId, id) {
        const row = await this.prisma.whatsAppBroadcast.findFirst({
            where: { id, companyId },
        });
        if (!row)
            throw new common_1.NotFoundException('Campanha não encontrada');
        return row;
    }
    async requireTrigger(companyId, id) {
        const row = await this.prisma.whatsAppTrigger.findFirst({
            where: { id, companyId },
        });
        if (!row)
            throw new common_1.NotFoundException('Gatilho não encontrado');
        return row;
    }
    nodeById(definition, id) {
        return definition.nodes.find((node) => node.id === id) ?? null;
    }
    matchMenu(node, inbound) {
        if (!node?.options?.length)
            return null;
        const text = inbound.trim().toLowerCase();
        const byKey = node.options.find((option) => option.key.toLowerCase() === text || text === option.key);
        if (byKey?.nextId)
            return byKey.nextId;
        const byLabel = node.options.find((option) => option.label.toLowerCase().includes(text) ||
            text.includes(option.label.toLowerCase()));
        if (byLabel?.nextId)
            return byLabel.nextId;
        const numeric = text.replace(/\D/g, '');
        const byIndex = node.options.find((option) => option.key === numeric);
        return byIndex?.nextId ?? null;
    }
    readCollected(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            return {};
        const out = {};
        for (const [key, item] of Object.entries(value)) {
            if (item != null)
                out[key] = String(item);
        }
        return out;
    }
    leadVarsFromConversation(conversation) {
        const name = conversation.lead?.name || conversation.name || '';
        return {
            nome: name,
            primeiro_nome: name.trim().split(/\s+/)[0] || '',
            etapa: conversation.lead?.stageName ?? '',
            origem: conversation.lead?.source ?? '',
        };
    }
    leadVars(lead, stageName) {
        const name = lead.contactName || lead.name;
        return {
            nome: name,
            primeiro_nome: name.trim().split(/\s+/)[0] || name,
            etapa: stageName,
            origem: lead.source,
        };
    }
};
exports.WhatsAppAutomationService = WhatsAppAutomationService;
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppAutomationService.prototype, "processScheduledJobs", null);
exports.WhatsAppAutomationService = WhatsAppAutomationService = WhatsAppAutomationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsAppService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService,
        whatsapp_routing_service_1.WhatsAppRoutingService,
        ai_service_1.AiService])
], WhatsAppAutomationService);
//# sourceMappingURL=whatsapp-automation.service.js.map