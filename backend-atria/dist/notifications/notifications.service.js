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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const kanban_content_type_1 = require("../kanban/kanban-content-type");
const kanban_status_1 = require("../kanban/kanban-status");
const mail_service_1 = require("../mail/mail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const PRIORITY_LABELS = {
    CRITICAL: 'Crítica',
    HIGH: 'Alta',
    MEDIUM: 'Média',
    LOW: 'Baixa',
    PLANNED: 'Planejado',
};
const CONTENT_TYPE_LABELS = Object.fromEntries(kanban_content_type_1.TASK_CONTENT_TYPE_DEFINITIONS.map((item) => [item.value, item.label]));
const DESIGNER_ROLES = [
    client_1.RoleName.DESIGNER_MASTER,
    client_1.RoleName.DESIGNER_JUNIOR,
];
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    config;
    mail;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma, config, mail) {
        this.prisma = prisma;
        this.config = config;
        this.mail = mail;
    }
    async findAll(userId, unreadOnly = false) {
        const notifications = await this.prisma.notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { isRead: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return notifications.map((notification) => this.toResponse(notification));
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
    async markAsRead(userId, id) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        const updated = await this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return this.toResponse(updated);
    }
    async markAllAsRead(userId) {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { success: true };
    }
    async notifyTaskAssigned(assigneeIds, taskTitle, actorId, options) {
        const recipients = assigneeIds.filter((id) => id !== actorId);
        await this.createMany(recipients, client_1.NotificationType.TASK_ASSIGNED, 'Nova tarefa atribuída', `Você foi atribuído à tarefa "${taskTitle}"`, options);
        if (!options?.taskId) {
            return;
        }
        try {
            const designers = await this.findDesignerRecipients(recipients);
            if (designers.length === 0) {
                return;
            }
            const details = await this.loadTaskMailDetails(options.taskId, actorId);
            const taskLink = this.buildTaskLink(options.taskId);
            const subject = `Nova tarefa atribuída: ${taskTitle}`;
            const intro = `Você foi atribuído à tarefa "${taskTitle}".`;
            for (const designer of designers) {
                this.sendTaskMail({
                    to: designer.email,
                    subject,
                    heading: 'Nova tarefa atribuída',
                    intro,
                    details,
                    actorLabel: 'Atribuída por',
                    ctaLabel: 'Abrir no Kanban',
                    ctaHref: taskLink,
                });
            }
        }
        catch (error) {
            const detail = error instanceof Error ? error.stack : String(error);
            this.logger.error(`Failed to email task assignment "${taskTitle}": ${detail}`);
        }
    }
    async notifyInternalApprovalPending(input) {
        const masters = await this.prisma.user.findMany({
            where: {
                companyId: input.companyId,
                isActive: true,
                role: { name: client_1.RoleName.MASTER },
                ...(input.actorId ? { id: { not: input.actorId } } : {}),
            },
            select: { id: true, email: true },
        });
        if (masters.length === 0) {
            this.logger.warn(`No Master users to notify for internal approval of task ${input.taskId}`);
            return;
        }
        await this.createMany(masters.map((user) => user.id), client_1.NotificationType.SYSTEM, 'Aprovação interna pendente', `A tarefa "${input.taskTitle}" aguarda aprovação interna`, { companyId: input.companyId, taskId: input.taskId });
        const approvalLink = this.buildAppLink('/internal-approvals');
        const subject = `Aprovação interna: ${input.taskTitle}`;
        const intro = `A tarefa "${input.taskTitle}" precisa de aprovação interna.`;
        const details = await this.loadTaskMailDetails(input.taskId, input.actorId);
        try {
            for (const master of masters) {
                this.sendTaskMail({
                    to: master.email,
                    subject,
                    heading: 'Aprovação interna pendente',
                    intro,
                    details,
                    actorLabel: 'Enviado por',
                    ctaLabel: 'Abrir aprovação interna',
                    ctaHref: approvalLink,
                });
            }
        }
        catch (error) {
            const detail = error instanceof Error ? error.stack : String(error);
            this.logger.error(`Failed to email internal approval for "${input.taskTitle}": ${detail}`);
        }
    }
    async notifyTaskReproved(input) {
        const assignees = await this.prisma.kanbanTaskAssignee.findMany({
            where: { taskId: input.taskId },
            select: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                        role: { select: { name: true } },
                    },
                },
            },
        });
        const designers = assignees
            .map((assignee) => assignee.user)
            .filter((user) => user.isActive &&
            DESIGNER_ROLES.includes(user.role.name) &&
            user.id !== input.actorId);
        if (designers.length === 0) {
            return;
        }
        const reason = input.reason?.trim();
        const message = reason
            ? `A tarefa "${input.taskTitle}" foi reprovada: ${reason.slice(0, 200)}`
            : `A tarefa "${input.taskTitle}" foi reprovada e precisa de ajustes`;
        await this.createMany(designers.map((user) => user.id), client_1.NotificationType.SYSTEM, 'Tarefa reprovada', message, { companyId: input.companyId, taskId: input.taskId });
        const taskLink = this.buildTaskLink(input.taskId);
        const subject = `Tarefa reprovada: ${input.taskTitle}`;
        const intro = `A tarefa "${input.taskTitle}" foi reprovada e precisa de ajustes.`;
        const details = await this.loadTaskMailDetails(input.taskId, input.actorId);
        try {
            for (const designer of designers) {
                this.sendTaskMail({
                    to: designer.email,
                    subject,
                    heading: 'Tarefa reprovada',
                    intro,
                    details,
                    reason,
                    actorLabel: 'Reprovada por',
                    ctaLabel: 'Abrir no Kanban',
                    ctaHref: taskLink,
                });
            }
        }
        catch (error) {
            const detail = error instanceof Error ? error.stack : String(error);
            this.logger.error(`Failed to email task reproval for "${input.taskTitle}": ${detail}`);
        }
    }
    async notifyContractSigned(userIds, contractTitle, clientName) {
        await this.createMany(userIds, client_1.NotificationType.CONTRACT_SIGNED, 'Contrato assinado', `O contrato "${contractTitle}" de ${clientName} foi assinado`);
    }
    async notifyPostPending(userIds, postTitle, clientName) {
        await this.createMany(userIds, client_1.NotificationType.POST_PENDING, 'Post aguardando aprovação', `"${postTitle}" de ${clientName} está pendente de aprovação`);
    }
    async notifyPostRejected(userIds, postTitle, clientName, reason) {
        await this.createMany(userIds, client_1.NotificationType.POST_REJECTED, 'Post rejeitado', `"${postTitle}" de ${clientName} foi rejeitado: ${reason.slice(0, 200)}`);
    }
    async notifyNewRequest(userIds, requestTitle, clientName, options) {
        await this.createMany(userIds, client_1.NotificationType.NEW_REQUEST, 'Nova solicitação', `${clientName} enviou a solicitação "${requestTitle}"`, options);
    }
    async notifyDueDateWarning(userIds, taskTitle, overdue, options) {
        const title = overdue ? 'Tarefa atrasada' : 'Prazo de entrega';
        const message = overdue
            ? `A tarefa "${taskTitle}" está atrasada.`
            : `A tarefa "${taskTitle}" vence em menos de 24 horas.`;
        await this.createMany(userIds, client_1.NotificationType.DUE_DATE_WARNING, title, message, options);
    }
    async notifyNewLeadInKanban(userIds, leadName, options) {
        await this.createMany(userIds, client_1.NotificationType.SYSTEM, 'Novo Lead no Kanban', `${leadName} foi adicionado ao seu funil.`, options);
    }
    async notifyAppUpdate(userIds, updateTitle, options) {
        await this.createMany(userIds, client_1.NotificationType.APP_UPDATE, 'Nova atualização do app', `Confira: "${updateTitle}"`, options);
    }
    async getAppUpdateUnreadCount(userId) {
        return this.prisma.notification.count({
            where: {
                userId,
                type: client_1.NotificationType.APP_UPDATE,
                isRead: false,
            },
        });
    }
    async markAppUpdateNotificationAsRead(userId, appUpdateId) {
        await this.prisma.notification.updateMany({
            where: {
                userId,
                type: client_1.NotificationType.APP_UPDATE,
                appUpdateId,
                isRead: false,
            },
            data: { isRead: true },
        });
        return { success: true };
    }
    async markAppUpdateNotificationsAsRead(userId) {
        await this.prisma.notification.updateMany({
            where: {
                userId,
                type: client_1.NotificationType.APP_UPDATE,
                isRead: false,
            },
            data: { isRead: true },
        });
        return { success: true };
    }
    async createMany(userIds, type, title, message, extra) {
        const uniqueIds = [...new Set(userIds)].filter(Boolean);
        if (uniqueIds.length === 0)
            return;
        await this.prisma.notification.createMany({
            data: uniqueIds.map((userId) => ({
                userId,
                type,
                title,
                message,
                ...(extra?.companyId ? { companyId: extra.companyId } : {}),
                ...(extra?.taskId ? { taskId: extra.taskId } : {}),
                ...(extra?.appUpdateId ? { appUpdateId: extra.appUpdateId } : {}),
            })),
        });
    }
    async findDesignerRecipients(userIds) {
        const uniqueIds = [...new Set(userIds)].filter(Boolean);
        if (uniqueIds.length === 0) {
            return [];
        }
        return this.prisma.user.findMany({
            where: {
                id: { in: uniqueIds },
                isActive: true,
                role: { name: { in: DESIGNER_ROLES } },
            },
            select: { id: true, email: true },
        });
    }
    sendTaskMail(input) {
        const rows = [
            ['Tarefa', input.details.title],
            ...(input.details.clientName
                ? [['Cliente', input.details.clientName]]
                : []),
            ['Status', input.details.status],
            ['Prioridade', input.details.priority],
            ...(input.details.contentType
                ? [['Tipo', input.details.contentType]]
                : []),
            ...(input.details.assignees
                ? [['Responsáveis', input.details.assignees]]
                : []),
            ...(input.details.groupName
                ? [['Grupo', input.details.groupName]]
                : []),
            ...(input.details.dueDate
                ? [['Prazo', input.details.dueDate]]
                : []),
            ...(input.details.deliveryDate
                ? [['Entrega', input.details.deliveryDate]]
                : []),
            ...(input.details.publicationDate
                ? [['Publicação', input.details.publicationDate]]
                : []),
            ...(input.details.createdBy
                ? [['Criada por', input.details.createdBy]]
                : []),
            ...(input.actorLabel && input.details.actorName
                ? [[input.actorLabel, input.details.actorName]]
                : []),
            ...(input.reason ? [['Motivo', input.reason]] : []),
        ];
        const text = [
            input.heading,
            '',
            input.intro,
            '',
            ...rows.map(([label, value]) => `${label}: ${value}`),
            ...(input.details.description
                ? ['', 'Descrição:', input.details.description]
                : []),
            '',
            `Link: ${input.ctaHref}`,
        ].join('\n');
        this.mail.sendInBackground({
            to: input.to,
            subject: input.subject,
            text,
            html: this.buildTaskHtml({
                heading: input.heading,
                intro: input.intro,
                rows,
                description: input.details.description,
                ctaLabel: input.ctaLabel,
                ctaHref: input.ctaHref,
            }),
        });
    }
    buildTaskHtml(input) {
        const rowHtml = input.rows
            .map(([label, value]) => `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 140px; vertical-align: top;">${this.escapeHtml(label)}</td>
            <td style="padding: 8px 0;">${this.escapeHtml(value)}</td>
          </tr>`)
            .join('');
        const descriptionHtml = input.description
            ? `<p style="margin: 20px 0 0; font-weight: bold;">Descrição</p>
        <p style="margin: 8px 0 0; white-space: pre-wrap;">${this.escapeHtml(input.description)}</p>`
            : '';
        return `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${this.escapeHtml(input.heading)}</h2>
        <p style="margin: 0 0 16px;">${this.escapeHtml(input.intro)}</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
          ${rowHtml}
        </table>
        ${descriptionHtml}
        <p style="margin: 24px 0 0;">
          <a href="${this.escapeHtml(input.ctaHref)}" style="display: inline-block; background: #004949; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">
            ${this.escapeHtml(input.ctaLabel)}
          </a>
        </p>
        <p style="margin: 12px 0 0; font-size: 12px; color: #6b7280;">
          ${this.escapeHtml(input.ctaHref)}
        </p>
      </div>
    `.trim();
    }
    async loadTaskMailDetails(taskId, actorId) {
        const task = await this.prisma.kanbanTask.findUnique({
            where: { id: taskId },
            select: {
                title: true,
                description: true,
                priority: true,
                status: true,
                contentType: true,
                dueDate: true,
                deliveryDate: true,
                publicationDate: true,
                client: { select: { companyName: true } },
                createdBy: { select: { name: true } },
                assignedGroup: { select: { name: true } },
                assignees: {
                    select: { user: { select: { name: true } } },
                },
            },
        });
        const actor = actorId
            ? await this.prisma.user.findUnique({
                where: { id: actorId },
                select: { name: true },
            })
            : null;
        const description = task?.description?.trim() || null;
        return {
            title: task?.title ?? 'Tarefa',
            description: description ? description.slice(0, 800) : null,
            clientName: task?.client?.companyName ?? null,
            priority: PRIORITY_LABELS[task?.priority ?? client_1.KanbanTaskPriority.MEDIUM],
            status: task?.status
                ? (kanban_status_1.STATUS_LABELS[task.status] ?? task.status)
                : '—',
            contentType: task?.contentType
                ? (CONTENT_TYPE_LABELS[task.contentType] ?? null)
                : null,
            assignees: task?.assignees
                .map((assignee) => assignee.user?.name)
                .filter((name) => Boolean(name))
                .join(', ') ?? '',
            groupName: task?.assignedGroup?.name ?? null,
            createdBy: task?.createdBy?.name ?? null,
            actorName: actor?.name ?? null,
            dueDate: this.formatDate(task?.dueDate ?? null),
            deliveryDate: this.formatDate(task?.deliveryDate ?? null),
            publicationDate: this.formatDate(task?.publicationDate ?? null),
        };
    }
    formatDate(value) {
        if (!value)
            return null;
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Sao_Paulo',
        }).format(value);
    }
    buildTaskLink(taskId) {
        return this.buildAppLink(`/kanban?taskId=${encodeURIComponent(taskId)}`);
    }
    buildAppLink(path) {
        const base = this.resolveAppUrl();
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `${base}${normalized}`;
    }
    resolveAppUrl() {
        const explicit = this.config.get('APP_URL')?.trim() ||
            this.config.get('FRONTEND_URL')?.trim();
        if (explicit) {
            return explicit.replace(/\/$/, '');
        }
        const corsOrigin = this.config.get('CORS_ORIGIN')?.trim();
        if (corsOrigin) {
            const first = corsOrigin
                .split(',')
                .map((origin) => origin.trim().replace(/^["']|["']$/g, ''))
                .find(Boolean);
            if (first) {
                return first.replace(/\/$/, '');
            }
        }
        return 'http://localhost:3000';
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    toResponse(notification) {
        return {
            id: notification.id,
            userId: notification.userId,
            title: notification.title,
            message: notification.message,
            type: String(notification.type).toLowerCase(),
            isRead: notification.isRead,
            taskId: notification.taskId ?? null,
            appUpdateId: notification.appUpdateId ?? null,
            createdAt: notification.createdAt.toISOString(),
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mail_service_1.MailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map