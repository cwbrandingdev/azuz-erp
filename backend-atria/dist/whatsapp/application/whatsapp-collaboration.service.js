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
var WhatsAppCollaborationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCollaborationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const ai_service_1 = require("../../ai/ai.service");
const notifications_service_1 = require("../../notifications/notifications.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_mentions_1 = require("../domain/whatsapp-mentions");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_service_1 = require("./whatsapp.service");
const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';
const TONE_HINT = {
    formal: 'tom formal e profissional, sem gírias',
    casual: 'tom casual, próximo e natural',
    empathetic: 'tom empático e acolhedor',
};
let WhatsAppCollaborationService = WhatsAppCollaborationService_1 = class WhatsAppCollaborationService {
    prisma;
    whatsApp;
    notifications;
    ai;
    logger = new common_1.Logger(WhatsAppCollaborationService_1.name);
    constructor(prisma, whatsApp, notifications, ai) {
        this.prisma = prisma;
        this.whatsApp = whatsApp;
        this.notifications = notifications;
        this.ai = ai;
    }
    async addPrivateNote(input) {
        const note = await this.whatsApp.addPrivateNote(input.phone, input.message, input.userId);
        const companyId = input.companyId ?? DEFAULT_COMPANY;
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone);
        try {
            await this.notifyMentions({
                companyId,
                phone,
                body: input.message,
                actorUserId: input.userId,
            });
        }
        catch (error) {
            this.logger.warn(`Mention notify failed: ${error instanceof Error ? error.message : error}`);
        }
        return note;
    }
    async transfer(input) {
        const companyId = input.companyId ?? DEFAULT_COMPANY;
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone);
        const note = input.note.trim();
        if (note.length < 8) {
            throw new common_1.BadRequestException('A nota de contexto é obrigatória');
        }
        const conversation = await this.prisma.whatsAppConversation.findUnique({
            where: { phone },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversa não encontrada');
        }
        const target = await this.resolveTransferTarget(companyId, input);
        const actor = await this.prisma.user.findUnique({
            where: { id: input.actorUserId },
            select: { name: true },
        });
        await this.prisma.whatsAppConversation.update({
            where: { phone },
            data: {
                assignedUserId: target.userId,
                assignedAt: new Date(),
                status: conversation.status === client_1.WhatsAppConversationStatus.RESOLVED
                    ? client_1.WhatsAppConversationStatus.OPEN
                    : conversation.status,
            },
        });
        const body = `Transferido para ${target.label} por ${actor?.name ?? 'atendente'}: ${note}`;
        const created = await this.addPrivateNote({
            companyId,
            phone,
            message: body,
            userId: input.actorUserId,
        });
        await this.notifications.createMany([target.userId], client_1.NotificationType.WHATSAPP_TRANSFER, 'Conversa transferida no WhatsApp', `${phone} · ${actor?.name ?? 'Alguém'} passou esta conversa: ${note}`, { companyId });
        await this.prisma.whatsAppCrmEvent.create({
            data: {
                companyId,
                phone,
                type: client_1.WhatsAppCrmEventType.TRANSFER,
                title: `Transferido para ${target.label}`,
                body: note,
                actorUserId: input.actorUserId,
            },
        });
        const summary = await this.whatsApp.getConversation(phone, companyId);
        return { conversation: summary, note: created, assignedTo: target };
    }
    async copilot(input) {
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(input.phone);
        const draft = input.text?.trim() ?? '';
        const history = await this.recentTranscript(phone);
        if ((input.action === 'rewrite' ||
            input.action === 'grammar' ||
            input.action === 'tone') &&
            !draft) {
            throw new common_1.BadRequestException('Informe o texto para o copiloto');
        }
        let prompt = '';
        if (input.action === 'suggest') {
            prompt = `Sugira UMA resposta curta de WhatsApp em português brasileiro (no máximo 3 frases, sem markdown) para o atendente enviar ao cliente.
${draft ? `Rascunho do atendente:\n${draft}\n` : ''}
Histórico recente:
${history}`;
        }
        else if (input.action === 'rewrite') {
            prompt = `Reescreva o texto abaixo para WhatsApp, mantendo o sentido, em português brasileiro, sem markdown:\n${draft}`;
        }
        else if (input.action === 'grammar') {
            prompt = `Corrija gramática e ortografia do texto abaixo sem mudar o sentido. Responda só com o texto corrigido:\n${draft}`;
        }
        else if (input.action === 'tone') {
            const hint = TONE_HINT[input.tone ?? 'formal'];
            prompt = `Reescreva o texto abaixo com ${hint}, para WhatsApp, em português brasileiro, sem markdown:\n${draft}`;
        }
        else {
            prompt = `Resuma esta conversa de WhatsApp para um atendente que vai assumir o caso. 4 a 6 linhas, português brasileiro, fatos e próximo passo. Sem markdown.
${history}`;
        }
        const text = await this.ai.completePlain(prompt, 'You help Brazilian WhatsApp agents. Reply only with the requested text.');
        return { text };
    }
    async notifyMentions(input) {
        const members = await this.prisma.user.findMany({
            where: {
                companyId: input.companyId,
                category: client_1.UserCategory.MEMBER,
                isActive: true,
            },
            select: { id: true, name: true },
        });
        const mentioned = (0, whatsapp_mentions_1.resolveMentionedUsers)(input.body, members, input.actorUserId);
        if (mentioned.length === 0)
            return;
        const actor = members.find((item) => item.id === input.actorUserId);
        const snippet = input.body.slice(0, 180);
        await this.notifications.createMany(mentioned.map((item) => item.id), client_1.NotificationType.WHATSAPP_MENTION, 'Você foi mencionado no WhatsApp', `${input.phone} · ${actor?.name ?? 'Alguém'}: ${snippet}`, { companyId: input.companyId });
        await this.prisma.whatsAppCrmEvent.create({
            data: {
                companyId: input.companyId,
                phone: input.phone,
                type: client_1.WhatsAppCrmEventType.MENTION,
                title: `Menção: ${mentioned.map((item) => item.name).join(', ')}`,
                body: input.body,
                actorUserId: input.actorUserId,
            },
        });
    }
    async resolveTransferTarget(companyId, input) {
        if (input.targetUserId) {
            const user = await this.prisma.user.findFirst({
                where: {
                    id: input.targetUserId,
                    companyId,
                    category: client_1.UserCategory.MEMBER,
                    isActive: true,
                },
                select: { id: true, name: true },
            });
            if (!user)
                throw new common_1.BadRequestException('Atendente inválido');
            return { userId: user.id, label: user.name };
        }
        if (input.targetUserGroupId) {
            const group = await this.prisma.userGroup.findFirst({
                where: { id: input.targetUserGroupId, companyId },
                select: { id: true, name: true },
            });
            if (!group)
                throw new common_1.BadRequestException('Setor inválido');
            const members = await this.prisma.user.findMany({
                where: {
                    companyId,
                    category: client_1.UserCategory.MEMBER,
                    isActive: true,
                    id: { not: input.actorUserId },
                    OR: [
                        { userGroupId: group.id },
                        { userGroups: { some: { userGroupId: group.id } } },
                    ],
                },
                select: { id: true, name: true },
            });
            if (members.length === 0) {
                throw new common_1.BadRequestException('Nenhum atendente neste setor');
            }
            const counts = await this.prisma.whatsAppConversation.groupBy({
                by: ['assignedUserId'],
                where: {
                    assignedUserId: { in: members.map((item) => item.id) },
                    status: { not: client_1.WhatsAppConversationStatus.RESOLVED },
                },
                _count: { _all: true },
            });
            const countById = new Map(counts.map((item) => [item.assignedUserId ?? '', item._count._all]));
            const chosen = [...members].sort((left, right) => (countById.get(left.id) ?? 0) - (countById.get(right.id) ?? 0))[0];
            return {
                userId: chosen.id,
                label: `${chosen.name} (${group.name})`,
            };
        }
        throw new common_1.BadRequestException('Escolha um atendente ou um setor');
    }
    async recentTranscript(phone) {
        const rows = await this.prisma.whatsAppMessage.findMany({
            where: {
                isPrivate: false,
                OR: [{ fromPhone: phone }, { toPhone: phone }],
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { body: true, direction: true, createdAt: true },
        });
        if (rows.length === 0)
            return '(sem histórico)';
        return [...rows]
            .reverse()
            .map((row) => {
            const who = row.direction === whatsapp_message_1.WhatsAppDirection.INBOUND ? 'Cliente' : 'Atendente';
            return `${who}: ${row.body}`;
        })
            .join('\n');
    }
};
exports.WhatsAppCollaborationService = WhatsAppCollaborationService;
exports.WhatsAppCollaborationService = WhatsAppCollaborationService = WhatsAppCollaborationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService,
        notifications_service_1.NotificationsService,
        ai_service_1.AiService])
], WhatsAppCollaborationService);
//# sourceMappingURL=whatsapp-collaboration.service.js.map