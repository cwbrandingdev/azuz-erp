import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KanbanTaskPriority, NotificationType, RoleName } from '@prisma/client';
import { TASK_CONTENT_TYPE_DEFINITIONS } from '../kanban/kanban-content-type';
import { STATUS_LABELS } from '../kanban/kanban-status';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const PRIORITY_LABELS: Record<KanbanTaskPriority, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
  PLANNED: 'Planejado',
};

const CONTENT_TYPE_LABELS = Object.fromEntries(
  TASK_CONTENT_TYPE_DEFINITIONS.map((item) => [item.value, item.label]),
) as Record<string, string>;

const DESIGNER_ROLES: RoleName[] = [
  RoleName.DESIGNER_MASTER,
  RoleName.DESIGNER_JUNIOR,
];

type TaskMailContext = {
  companyId: string;
  taskId: string;
  taskTitle: string;
  actorId?: string | null;
  reason?: string | null;
};

type TaskMailDetails = {
  title: string;
  description: string | null;
  clientName: string | null;
  priority: string;
  status: string;
  contentType: string | null;
  assignees: string;
  groupName: string | null;
  createdBy: string | null;
  actorName: string | null;
  dueDate: string | null;
  deliveryDate: string | null;
  publicationDate: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async findAll(userId: string, unreadOnly = false) {
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

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return this.toResponse(updated);
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async notifyTaskAssigned(
    assigneeIds: string[],
    taskTitle: string,
    actorId: string,
    options?: { companyId?: string; taskId?: string },
  ) {
    const recipients = assigneeIds.filter((id) => id !== actorId);
    await this.createMany(
      recipients,
      NotificationType.TASK_ASSIGNED,
      'Nova tarefa atribuída',
      `Você foi atribuído à tarefa "${taskTitle}"`,
      options,
    );

    if (!options?.taskId) {
      return;
    }

    try {
      const designers = await this.findDesignerRecipients(recipients);
      if (designers.length === 0) {
        return;
      }

      const details = await this.loadTaskMailDetails(
        options.taskId,
        actorId,
      );
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
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to email task assignment "${taskTitle}": ${detail}`);
    }
  }

  async notifyInternalApprovalPending(input: TaskMailContext) {
    const masters = await this.prisma.user.findMany({
      where: {
        companyId: input.companyId,
        isActive: true,
        role: { name: RoleName.MASTER },
        ...(input.actorId ? { id: { not: input.actorId } } : {}),
      },
      select: { id: true, email: true },
    });

    if (masters.length === 0) {
      this.logger.warn(
        `No Master users to notify for internal approval of task ${input.taskId}`,
      );
      return;
    }

    await this.createMany(
      masters.map((user) => user.id),
      NotificationType.SYSTEM,
      'Aprovação interna pendente',
      `A tarefa "${input.taskTitle}" aguarda aprovação interna`,
      { companyId: input.companyId, taskId: input.taskId },
    );

    const approvalLink = this.buildAppLink('/internal-approvals');
    const subject = `Aprovação interna: ${input.taskTitle}`;
    const intro = `A tarefa "${input.taskTitle}" precisa de aprovação interna.`;
    const details = await this.loadTaskMailDetails(
      input.taskId,
      input.actorId,
    );

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
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to email internal approval for "${input.taskTitle}": ${detail}`,
      );
    }
  }

  async notifyTaskReproved(input: TaskMailContext) {
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
      .filter(
        (user) =>
          user.isActive &&
          DESIGNER_ROLES.includes(user.role.name) &&
          user.id !== input.actorId,
      );

    if (designers.length === 0) {
      return;
    }

    const reason = input.reason?.trim();
    const message = reason
      ? `A tarefa "${input.taskTitle}" foi reprovada: ${reason.slice(0, 200)}`
      : `A tarefa "${input.taskTitle}" foi reprovada e precisa de ajustes`;

    await this.createMany(
      designers.map((user) => user.id),
      NotificationType.SYSTEM,
      'Tarefa reprovada',
      message,
      { companyId: input.companyId, taskId: input.taskId },
    );

    const taskLink = this.buildTaskLink(input.taskId);
    const subject = `Tarefa reprovada: ${input.taskTitle}`;
    const intro = `A tarefa "${input.taskTitle}" foi reprovada e precisa de ajustes.`;
    const details = await this.loadTaskMailDetails(
      input.taskId,
      input.actorId,
    );

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
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to email task reproval for "${input.taskTitle}": ${detail}`,
      );
    }
  }

  async notifyContractSigned(
    userIds: string[],
    contractTitle: string,
    clientName: string,
  ) {
    await this.createMany(
      userIds,
      NotificationType.CONTRACT_SIGNED,
      'Contrato assinado',
      `O contrato "${contractTitle}" de ${clientName} foi assinado`,
    );
  }

  async notifyPostPending(
    userIds: string[],
    postTitle: string,
    clientName: string,
  ) {
    await this.createMany(
      userIds,
      NotificationType.POST_PENDING,
      'Post aguardando aprovação',
      `"${postTitle}" de ${clientName} está pendente de aprovação`,
    );
  }

  async notifyPostRejected(
    userIds: string[],
    postTitle: string,
    clientName: string,
    reason: string,
  ) {
    await this.createMany(
      userIds,
      NotificationType.POST_REJECTED,
      'Post rejeitado',
      `"${postTitle}" de ${clientName} foi rejeitado: ${reason.slice(0, 200)}`,
    );
  }

  async notifyNewRequest(
    userIds: string[],
    requestTitle: string,
    clientName: string,
    options?: { companyId?: string },
  ) {
    await this.createMany(
      userIds,
      NotificationType.NEW_REQUEST,
      'Nova solicitação',
      `${clientName} enviou a solicitação "${requestTitle}"`,
      options,
    );
  }

  async notifyDueDateWarning(
    userIds: string[],
    taskTitle: string,
    overdue: boolean,
    options: { companyId: string; taskId: string },
  ) {
    const title = overdue ? 'Tarefa atrasada' : 'Prazo de entrega';
    const message = overdue
      ? `A tarefa "${taskTitle}" está atrasada.`
      : `A tarefa "${taskTitle}" vence em menos de 24 horas.`;

    await this.createMany(
      userIds,
      NotificationType.DUE_DATE_WARNING,
      title,
      message,
      options,
    );
  }

  async notifyNewLeadInKanban(
    userIds: string[],
    leadName: string,
    options?: { companyId?: string },
  ) {
    await this.createMany(
      userIds,
      NotificationType.SYSTEM,
      'Novo Lead no Kanban',
      `${leadName} foi adicionado ao seu funil.`,
      options,
    );
  }

  async notifyAppUpdate(
    userIds: string[],
    updateTitle: string,
    options?: { companyId?: string; appUpdateId?: string },
  ) {
    await this.createMany(
      userIds,
      NotificationType.APP_UPDATE,
      'Nova atualização do app',
      `Confira: "${updateTitle}"`,
      options,
    );
  }

  async getAppUpdateUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        type: NotificationType.APP_UPDATE,
        isRead: false,
      },
    });
  }

  async markAppUpdateNotificationAsRead(userId: string, appUpdateId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        type: NotificationType.APP_UPDATE,
        appUpdateId,
        isRead: false,
      },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAppUpdateNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        type: NotificationType.APP_UPDATE,
        isRead: false,
      },
      data: { isRead: true },
    });
    return { success: true };
  }

  async createMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    extra?: { companyId?: string; taskId?: string; appUpdateId?: string },
  ) {
    const uniqueIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueIds.length === 0) return;

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

  private async findDesignerRecipients(userIds: string[]) {
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

  private sendTaskMail(input: {
    to: string;
    subject: string;
    heading: string;
    intro: string;
    details: TaskMailDetails;
    reason?: string;
    actorLabel?: string;
    ctaLabel: string;
    ctaHref: string;
  }) {
    const rows: Array<[string, string]> = [
      ['Tarefa', input.details.title],
      ...(input.details.clientName
        ? ([['Cliente', input.details.clientName]] as Array<[string, string]>)
        : []),
      ['Status', input.details.status],
      ['Prioridade', input.details.priority],
      ...(input.details.contentType
        ? ([['Tipo', input.details.contentType]] as Array<[string, string]>)
        : []),
      ...(input.details.assignees
        ? ([['Responsáveis', input.details.assignees]] as Array<[string, string]>)
        : []),
      ...(input.details.groupName
        ? ([['Grupo', input.details.groupName]] as Array<[string, string]>)
        : []),
      ...(input.details.dueDate
        ? ([['Prazo', input.details.dueDate]] as Array<[string, string]>)
        : []),
      ...(input.details.deliveryDate
        ? ([['Entrega', input.details.deliveryDate]] as Array<[string, string]>)
        : []),
      ...(input.details.publicationDate
        ? ([['Publicação', input.details.publicationDate]] as Array<
            [string, string]
          >)
        : []),
      ...(input.details.createdBy
        ? ([['Criada por', input.details.createdBy]] as Array<[string, string]>)
        : []),
      ...(input.actorLabel && input.details.actorName
        ? ([[input.actorLabel, input.details.actorName]] as Array<[string, string]>)
        : []),
      ...(input.reason ? ([['Motivo', input.reason]] as Array<[string, string]>) : []),
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

  private buildTaskHtml(input: {
    heading: string;
    intro: string;
    rows: Array<[string, string]>;
    description: string | null;
    ctaLabel: string;
    ctaHref: string;
  }): string {
    const rowHtml = input.rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 140px; vertical-align: top;">${this.escapeHtml(label)}</td>
            <td style="padding: 8px 0;">${this.escapeHtml(value)}</td>
          </tr>`,
      )
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

  private async loadTaskMailDetails(
    taskId: string,
    actorId?: string | null,
  ): Promise<TaskMailDetails> {
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
      priority: PRIORITY_LABELS[task?.priority ?? KanbanTaskPriority.MEDIUM],
      status: task?.status
        ? (STATUS_LABELS[task.status] ?? task.status)
        : '—',
      contentType: task?.contentType
        ? (CONTENT_TYPE_LABELS[task.contentType] ?? null)
        : null,
      assignees:
        task?.assignees
          .map((assignee) => assignee.user?.name)
          .filter((name): name is string => Boolean(name))
          .join(', ') ?? '',
      groupName: task?.assignedGroup?.name ?? null,
      createdBy: task?.createdBy?.name ?? null,
      actorName: actor?.name ?? null,
      dueDate: this.formatDate(task?.dueDate ?? null),
      deliveryDate: this.formatDate(task?.deliveryDate ?? null),
      publicationDate: this.formatDate(task?.publicationDate ?? null),
    };
  }

  private formatDate(value: Date | null): string | null {
    if (!value) return null;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(value);
  }

  private buildTaskLink(taskId: string): string {
    return this.buildAppLink(`/kanban?taskId=${encodeURIComponent(taskId)}`);
  }

  private buildAppLink(path: string): string {
    const base = this.resolveAppUrl();
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalized}`;
  }

  private resolveAppUrl(): string {
    const explicit =
      this.config.get<string>('APP_URL')?.trim() ||
      this.config.get<string>('FRONTEND_URL')?.trim();
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }

    const corsOrigin = this.config.get<string>('CORS_ORIGIN')?.trim();
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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private toResponse(notification: {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType | string;
    isRead: boolean;
    createdAt: Date;
    taskId?: string | null;
    appUpdateId?: string | null;
  }) {
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
}
