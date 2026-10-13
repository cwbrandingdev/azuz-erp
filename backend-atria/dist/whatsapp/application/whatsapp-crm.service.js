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
var WhatsAppCrmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCrmService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_service_1 = require("./whatsapp.service");
const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';
let WhatsAppCrmService = WhatsAppCrmService_1 = class WhatsAppCrmService {
    prisma;
    whatsApp;
    logger = new common_1.Logger(WhatsAppCrmService_1.name);
    constructor(prisma, whatsApp) {
        this.prisma = prisma;
        this.whatsApp = whatsApp;
    }
    async getContext(phone, companyId = DEFAULT_COMPANY) {
        const normalized = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
        const lead = await this.findLeadByPhone(normalized, companyId);
        const [deals, timeline] = await Promise.all([
            this.loadOpenDeals(lead, companyId),
            this.loadTimeline(normalized, lead?.id ?? null, companyId),
        ]);
        return {
            contact: lead ? this.toContact(lead) : null,
            openDeals: deals,
            timeline,
        };
    }
    async updateContact(phone, companyId, patch, actorUserId) {
        const normalized = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
        let lead = await this.findLeadByPhone(normalized, companyId);
        if (!lead) {
            lead = await this.prisma.lead.create({
                data: {
                    companyId,
                    name: patch.name?.trim() || normalized,
                    phone: normalized,
                    source: patch.source?.trim() || 'whatsapp',
                    contactName: patch.contactName ?? null,
                    email: patch.email ?? null,
                    cnpj: patch.cnpj ?? null,
                    jobTitle: patch.jobTitle ?? null,
                    orcamento: patch.orcamento ?? null,
                    kanbanTracked: true,
                },
                include: {
                    stage: { select: { name: true } },
                    organization: { select: { companyName: true } },
                },
            });
            await this.logEvent({
                companyId,
                leadId: lead.id,
                phone: normalized,
                type: client_1.WhatsAppCrmEventType.LEAD_CREATED,
                title: 'Lead criado pelo WhatsApp',
                actorUserId,
            });
            return this.toContact(lead);
        }
        const changes = [];
        const data = {};
        const set = (key, label, next, current) => {
            if (next === undefined || next === current)
                return;
            data[key] = next;
            changes.push(`${label}: ${current ?? '—'} → ${next ?? '—'}`);
        };
        set('name', 'Nome', patch.name?.trim(), lead.name);
        set('contactName', 'Contato', patch.contactName, lead.contactName);
        set('email', 'E-mail', patch.email, lead.email);
        set('cnpj', 'CNPJ', patch.cnpj, lead.cnpj);
        set('jobTitle', 'Cargo', patch.jobTitle, lead.jobTitle);
        set('source', 'Origem', patch.source, lead.source);
        if (patch.orcamento !== undefined) {
            const current = lead.orcamento == null ? null : Number(lead.orcamento);
            if (patch.orcamento !== current) {
                data.orcamento = patch.orcamento;
                changes.push(`Ticket: ${current ?? '—'} → ${patch.orcamento ?? '—'}`);
            }
        }
        if (Object.keys(data).length === 0) {
            return this.toContact(lead);
        }
        const updated = await this.prisma.lead.update({
            where: { id: lead.id },
            data,
            include: {
                stage: { select: { name: true } },
                organization: { select: { companyName: true } },
            },
        });
        await this.logEvent({
            companyId,
            leadId: updated.id,
            phone: normalized,
            type: client_1.WhatsAppCrmEventType.FIELD_CHANGE,
            title: 'Dados do contato atualizados',
            body: changes.join('\n'),
            actorUserId,
        });
        return this.toContact(updated);
    }
    async listStageMessages(companyId) {
        const rows = await this.prisma.whatsAppStageMessage.findMany({
            where: { companyId },
            include: { stage: { select: { name: true } } },
            orderBy: { stage: { order: 'asc' } },
        });
        return rows.map((row) => ({
            id: row.id,
            companyId: row.companyId,
            stageId: row.stageId,
            stageName: row.stage.name,
            enabled: row.enabled,
            body: row.body,
            templateName: row.templateName,
            templateLanguage: row.templateLanguage,
        }));
    }
    async replaceStageMessages(companyId, rules) {
        await this.prisma.whatsAppStageMessage.deleteMany({ where: { companyId } });
        const filtered = rules.filter((rule) => rule.stageId);
        if (filtered.length > 0) {
            await this.prisma.whatsAppStageMessage.createMany({
                data: filtered.map((rule) => ({
                    companyId,
                    stageId: rule.stageId,
                    enabled: rule.enabled ?? true,
                    body: rule.body?.trim() || null,
                    templateName: rule.templateName?.trim() || null,
                    templateLanguage: rule.templateLanguage?.trim() || null,
                })),
            });
        }
        return this.listStageMessages(companyId);
    }
    async notifyStageMove(input) {
        const phone = input.phone ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone) : '';
        await this.logEvent({
            companyId: input.companyId,
            leadId: input.leadId,
            phone: phone || input.leadId,
            type: client_1.WhatsAppCrmEventType.STAGE_CHANGE,
            title: `Etapa: ${input.fromStageName ?? '—'} → ${input.toStageName}`,
            actorUserId: input.actorUserId,
        });
        if (!phone)
            return;
        const rule = await this.prisma.whatsAppStageMessage.findUnique({
            where: {
                companyId_stageId: {
                    companyId: input.companyId,
                    stageId: input.toStageId,
                },
            },
        });
        if (!rule?.enabled)
            return;
        if (!rule.body && !rule.templateName)
            return;
        const lead = await this.prisma.lead.findUnique({
            where: { id: input.leadId },
        });
        if (!lead)
            return;
        const vars = this.varsFor(lead, input.toStageName);
        try {
            if (rule.templateName) {
                const language = rule.templateLanguage || 'pt_BR';
                const parameters = this.extractPlaceholders(rule.body || '', vars);
                await this.whatsApp.sendTemplate(phone, rule.templateName, language, parameters, input.actorUserId);
            }
            else if (rule.body) {
                await this.whatsApp.send(phone, this.interpolate(rule.body, vars), input.actorUserId);
            }
            await this.logEvent({
                companyId: input.companyId,
                leadId: input.leadId,
                phone,
                type: client_1.WhatsAppCrmEventType.AUTO_MESSAGE,
                title: `Mensagem automática · ${input.toStageName}`,
                body: rule.templateName
                    ? `Template ${rule.templateName}`
                    : this.interpolate(rule.body ?? '', vars),
                actorUserId: input.actorUserId,
            });
        }
        catch (error) {
            this.logger.warn(`Auto WhatsApp on stage move failed: ${error instanceof Error ? error.message : error}`);
            await this.logEvent({
                companyId: input.companyId,
                leadId: input.leadId,
                phone,
                type: client_1.WhatsAppCrmEventType.AUTO_MESSAGE,
                title: `Falha ao enviar mensagem · ${input.toStageName}`,
                body: error instanceof Error ? error.message : 'Falha no envio',
                actorUserId: input.actorUserId,
            });
        }
    }
    async findLeadByPhone(phone, companyId) {
        const needle = phone.slice(-8);
        const rows = await this.prisma.lead.findMany({
            where: {
                companyId,
                deletedAt: null,
                phone: { contains: needle },
            },
            include: {
                stage: { select: { name: true } },
                organization: { select: { companyName: true } },
            },
            take: 25,
            orderBy: { updatedAt: 'desc' },
        });
        return (rows.find((row) => (0, whatsapp_phone_1.normalizeWhatsAppPhone)(row.phone ?? '') === phone) ?? null);
    }
    async loadOpenDeals(lead, companyId) {
        if (!lead)
            return [];
        const deals = [];
        const siblingOr = [];
        if (lead.organizationId) {
            siblingOr.push({ organizationId: lead.organizationId });
        }
        if (lead.phone) {
            siblingOr.push({ phone: lead.phone });
        }
        const siblingLeads = siblingOr.length
            ? await this.prisma.lead.findMany({
                where: {
                    companyId,
                    deletedAt: null,
                    id: { not: lead.id },
                    kanbanTracked: true,
                    status: { notIn: [client_1.LeadStatus.NAO_TEM_INTERESSE] },
                    OR: siblingOr,
                },
                include: { stage: { select: { name: true } } },
                take: 8,
                orderBy: { updatedAt: 'desc' },
            })
            : [];
        for (const item of siblingLeads) {
            deals.push({
                id: item.id,
                kind: 'lead',
                title: item.name,
                status: item.stage?.name || item.status,
                value: item.orcamento == null ? null : Number(item.orcamento),
            });
        }
        if (lead.organizationId) {
            const [proposals, contracts] = await Promise.all([
                this.prisma.proposal.findMany({
                    where: {
                        companyId,
                        clientId: lead.organizationId,
                        status: {
                            in: [client_1.ProposalStatus.DRAFT, client_1.ProposalStatus.PUBLISHED],
                        },
                    },
                    take: 8,
                    orderBy: { updatedAt: 'desc' },
                }),
                this.prisma.contract.findMany({
                    where: {
                        companyId,
                        clientId: lead.organizationId,
                        status: {
                            in: [
                                client_1.ContractStatus.DRAFT,
                                client_1.ContractStatus.SENT,
                                client_1.ContractStatus.SIGNED,
                            ],
                        },
                    },
                    take: 8,
                    orderBy: { updatedAt: 'desc' },
                }),
            ]);
            for (const item of proposals) {
                deals.push({
                    id: item.id,
                    kind: 'proposal',
                    title: item.title,
                    status: item.status,
                    value: Number(item.totalValue),
                });
            }
            for (const item of contracts) {
                deals.push({
                    id: item.id,
                    kind: 'contract',
                    title: item.title,
                    status: item.status,
                    value: Number(item.recurringValue),
                });
            }
        }
        return deals;
    }
    async loadTimeline(phone, leadId, companyId) {
        const items = [];
        const messages = await this.prisma.whatsAppMessage.findMany({
            where: {
                OR: [{ fromPhone: phone }, { toPhone: phone }],
                isPrivate: false,
            },
            include: { sentBy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        for (const row of messages) {
            items.push({
                id: `msg-${row.id}`,
                type: 'MESSAGE',
                title: row.direction === 'INBOUND' ? 'Mensagem recebida' : 'Mensagem enviada',
                body: row.body,
                actorName: row.sentBy?.name ?? null,
                createdAt: row.createdAt,
            });
        }
        if (leadId) {
            const [comments, calls, events] = await Promise.all([
                this.prisma.leadComment.findMany({
                    where: { leadId },
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                }),
                this.prisma.leadCall.findMany({
                    where: { leadId },
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                }),
                this.prisma.whatsAppCrmEvent.findMany({
                    where: { companyId, OR: [{ leadId }, { phone }] },
                    include: { actor: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 40,
                }),
            ]);
            for (const row of comments) {
                items.push({
                    id: `note-${row.id}`,
                    type: 'NOTE',
                    title: 'Comentário no lead',
                    body: row.content,
                    actorName: row.user.name,
                    createdAt: row.createdAt,
                });
            }
            for (const row of calls) {
                items.push({
                    id: `call-${row.id}`,
                    type: 'CALL',
                    title: `Ligação · ${row.outcome}`,
                    body: row.notes,
                    actorName: row.user.name,
                    createdAt: row.createdAt,
                });
            }
            for (const row of events) {
                items.push({
                    id: `evt-${row.id}`,
                    type: row.type,
                    title: row.title,
                    body: row.body,
                    actorName: row.actor?.name ?? null,
                    createdAt: row.createdAt,
                });
            }
        }
        return items
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, 50);
    }
    async logEvent(input) {
        await this.prisma.whatsAppCrmEvent.create({
            data: {
                companyId: input.companyId,
                leadId: input.leadId ?? null,
                phone: input.phone,
                type: input.type,
                title: input.title,
                body: input.body ?? null,
                actorUserId: input.actorUserId ?? null,
            },
        });
    }
    toContact(lead) {
        return {
            id: lead.id,
            name: lead.name,
            contactName: lead.contactName,
            phone: lead.phone,
            email: lead.email,
            cnpj: lead.cnpj,
            jobTitle: lead.jobTitle,
            source: lead.source,
            orcamento: lead.orcamento == null ? null : Number(lead.orcamento),
            status: lead.status,
            stageId: lead.stageId,
            stageName: lead.stage?.name ?? null,
            organizationId: lead.organizationId,
            organizationName: lead.organization?.companyName ?? null,
        };
    }
    varsFor(lead, stageName) {
        const first = (lead.contactName || lead.name).trim().split(/\s+/)[0] || lead.name;
        const ticket = lead.orcamento == null
            ? ''
            : Number(lead.orcamento).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            });
        return {
            primeiro_nome: first,
            nome: lead.name,
            valor_proposta: ticket,
            ticket: ticket,
            etapa: stageName,
            origem: lead.source,
            cnpj: lead.cnpj ?? '',
            cargo: lead.jobTitle ?? '',
            link_pagamento: '',
        };
    }
    interpolate(template, vars) {
        return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
            return vars[key] ?? '';
        });
    }
    extractPlaceholders(template, vars) {
        const keys = [...template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1]);
        const unique = [...new Set(keys)];
        return unique.map((key) => vars[key] ?? '');
    }
};
exports.WhatsAppCrmService = WhatsAppCrmService;
exports.WhatsAppCrmService = WhatsAppCrmService = WhatsAppCrmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService])
], WhatsAppCrmService);
//# sourceMappingURL=whatsapp-crm.service.js.map