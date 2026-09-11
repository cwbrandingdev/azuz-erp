import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
  forwardRef,
} from '@nestjs/common';
import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostStatus,
  EventCategory,
  KanbanColumn,
  KanbanColumnType,
  KanbanTaskContentType,
  KanbanTaskPriority,
  KanbanTaskStatus,
  InternalReviewStatus,
  ProductionPhase,
  Prisma,
  RoleName,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { readFileSync, unlinkSync } from 'fs';
import { extname } from 'path';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import {
  assertCanPerformInternalApproval,
  assertKanbanTaskEditAccess,
  canEditAllKanban,
} from '../auth/utils/rbac';
import { PrismaService, PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SlaService } from '../sla/sla.service';
import { resolveTaskContentType } from './kanban-content-type';
import { DEFAULT_TASK_STATUS } from './kanban-defaults';
import {
  KANBAN_STATUS_DEFINITIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  statusToApi,
} from './kanban-status';
import {
  contentTypeRequiresScript,
  defaultProductionPhaseForContentType,
  isProductionPhase,
  resolveProductionPhaseForStatus,
  resolveTaskDisplayColor,
} from './production-phase';
import { toUnifiedTaskCore } from './kanban-task.mapper';
import { CreateCommentDto } from './dto/comment.dto';
import {
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { QueryDeletionHistoryDto } from './dto/deletion-history.dto';
import {
  CreateTaskDto,
  MoveTaskDto,
  QueryTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import {
  InternalReviewAction,
  InternalReviewDto,
} from './dto/internal-review.dto';

const userSelect = { id: true, name: true, avatarUrl: true } as const;

const clientSelect = {
  id: true,
  companyName: true,
  avatarUrl: true,
} as const;

const groupSelect = {
  id: true,
  name: true,
  color: true,
} as const;

const taskInclude = {
  column: true,
  client: { select: clientSelect },
  createdBy: { select: userSelect },
  assignedGroup: { select: groupSelect },
  assignees: { include: { user: { select: userSelect } } },
  assets: {
    include: { uploadedBy: { select: userSelect } },
    orderBy: { uploadedAt: 'desc' as const },
  },
} satisfies Prisma.KanbanTaskInclude;

type DbClient = Prisma.TransactionClient | PrismaService;

type TaskWithRelations = Prisma.KanbanTaskGetPayload<{
  include: typeof taskInclude;
}>;

type PreparedTaskCreate = {
  title: string;
  description?: string;
  postCaption?: string;
  columnId: string;
  status: KanbanTaskStatus;
  productionPhase: ProductionPhase | null;
  contentType: KanbanTaskContentType;
  clientId?: string;
  contentPostId?: string;
  calendarEventId?: string;
  assignedGroupId: string | null;
  referenceUrl?: string;
  priority: KanbanTaskPriority;
  dueDate: Date | null;
  publicationDate: Date | null;
  deliveryDate: Date | null;
  slaResponseDueAt: Date | null;
  slaResolutionDueAt: Date | null;
  createdById: string;
  assigneeIds: string[];
};

const PRIORITY_LABELS: Record<KanbanTaskPriority, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
  PLANNED: 'Planejado',
};

@Injectable()
export class KanbanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly slaService: SlaService,
    private readonly storage: SupabaseStorageService,
    @Inject(forwardRef(() => DeliverablesService))
    private readonly deliverablesService: DeliverablesService,
  ) {}

  async getColumns() {
    await this.ensureStatusColumns();

    const columns = await this.prisma.kanbanColumn.findMany({
      where: { statusKey: { not: null } },
      orderBy: { order: 'asc' },
    });

    return columns.map((column) => this.toColumnResponse(column));
  }

  async createColumn(dto: CreateColumnDto) {
    const maxOrder = await this.prisma.kanbanColumn.aggregate({
      _max: { order: true },
    });

    const column = await this.prisma.kanbanColumn.create({
      data: {
        title: dto.title,
        color: dto.color ?? '#004949',
        type: KanbanColumnType.CUSTOM,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });

    return this.toColumnResponse(column);
  }

  async updateColumn(id: string, dto: UpdateColumnDto) {
    await this.ensureColumnExists(id);

    const column = await this.prisma.kanbanColumn.update({
      where: { id },
      data: dto,
    });

    return this.toColumnResponse(column);
  }

  async deleteColumn(id: string) {
    await this.ensureColumnExists(id);

    const taskCount = await this.prisma.kanbanTask.count({
      where: { columnId: id, deletedAt: null },
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        'Cannot delete a column that contains tasks',
      );
    }

    await this.prisma.kanbanColumn.delete({ where: { id } });
  }

  async reorderColumns(dto: ReorderColumnsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.kanbanColumn.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return this.getColumns();
  }

  async getTasks(query: QueryTasksDto) {
    const where: Prisma.KanbanTaskWhereInput = { deletedAt: null };
    if (query.columnId) where.columnId = query.columnId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.organizationId) where.companyId = query.organizationId;

    if (query.startDate || query.endDate) {
      const publicationDateFilter: Prisma.DateTimeNullableFilter = {
        not: null,
      };
      if (query.startDate) {
        publicationDateFilter.gte = this.parseTaskRangeStart(query.startDate);
      }
      if (query.endDate) {
        publicationDateFilter.lte = this.parseTaskRangeEnd(query.endDate);
      }
      where.publicationDate = publicationDateFilter;
    }

    const tasks = await this.prisma.kanbanTask.findMany({
      where,
      include: this.taskInclude(),
      orderBy: [{ columnId: 'asc' }, { order: 'asc' }],
    });

    return tasks.map((task) => this.toTaskResponse(task));
  }

  async getTask(id: string) {
    const task = await this.ensureTaskExists(id);
    return this.toTaskResponse(task);
  }

  async createTask(
    userId: string,
    dto: CreateTaskDto,
    options?: {
      tx?: Prisma.TransactionClient;
      skipSideEffects?: boolean;
      prepared?: PreparedTaskCreate;
    },
  ) {
    const prepared =
      options?.prepared ?? (await this.prepareTaskCreate(userId, dto));
    const task = await this.insertPreparedTask(
      options?.tx ?? this.prisma,
      prepared,
    );

    if (options?.skipSideEffects) {
      return this.toTaskResponse(task);
    }

    return this.finalizeNewTask(userId, task.id);
  }

  async prepareTaskCreate(userId: string, dto: CreateTaskDto) {
    const column = dto.columnId
      ? await this.ensureColumnExists(dto.columnId)
      : null;
    if (dto.clientId) await this.ensureClientExists(dto.clientId);

    const assignedGroupId = dto.assignedGroupId ?? null;
    if (assignedGroupId) {
      await this.ensureGroupExists(assignedGroupId);
    }

    const assigneeIds = await this.resolveAssigneeIds({
      assigneeIds: dto.assigneeIds,
      assignedGroupId,
    });
    await this.validateAssignees(assigneeIds);

    const status = dto.status ?? column?.statusKey ?? DEFAULT_TASK_STATUS;
    const statusColumn = await this.resolveColumnForStatus(status);
    const columnId = statusColumn?.id ?? column?.id;
    if (!columnId) {
      throw new BadRequestException('Nenhuma coluna do kanban configurada.');
    }
    const contentType = resolveTaskContentType(dto.contentType);
    const productionPhase = resolveProductionPhaseForStatus(
      status,
      null,
      dto.productionPhase,
      contentType,
    );
    this.assertValidProductionColumnTarget(status, productionPhase);
    const priority = dto.priority ?? KanbanTaskPriority.MEDIUM;
    const slaDueDates = await this.slaService.computeDueDatesForPriority(
      priority,
      new Date(),
    );
    const schedule = this.resolveTaskSchedule(dto);

    let calendarEventId = dto.calendarEventId;
    if (!calendarEventId && dto.contentPostId) {
      const linkedEvent = await this.prisma.calendarEvent.findFirst({
        where: { contentPostId: dto.contentPostId },
        select: { id: true },
      });
      calendarEventId = linkedEvent?.id;
    }

    return {
      title: dto.title,
      description: dto.description,
      postCaption: dto.postCaption,
      columnId,
      status,
      productionPhase,
      contentType,
      clientId: dto.clientId,
      contentPostId: dto.contentPostId,
      calendarEventId,
      assignedGroupId,
      referenceUrl: dto.referenceUrl,
      priority,
      dueDate: schedule.dueDate,
      publicationDate: schedule.publicationDate,
      deliveryDate: schedule.deliveryDate,
      slaResponseDueAt: slaDueDates.slaResponseDueAt,
      slaResolutionDueAt: slaDueDates.slaResolutionDueAt,
      createdById: userId,
      assigneeIds,
    } satisfies PreparedTaskCreate;
  }

  private async insertPreparedTask(db: DbClient, prepared: PreparedTaskCreate) {
    const maxOrder = await db.kanbanTask.aggregate({
      where: { columnId: prepared.columnId, deletedAt: null },
      _max: { order: true },
    });

    return db.kanbanTask.create({
      data: {
        title: prepared.title,
        description: prepared.description,
        postCaption: prepared.postCaption,
        columnId: prepared.columnId,
        status: prepared.status,
        productionPhase: prepared.productionPhase,
        contentType: prepared.contentType,
        clientId: prepared.clientId,
        contentPostId: prepared.contentPostId,
        calendarEventId: prepared.calendarEventId,
        assignedGroupId: prepared.assignedGroupId,
        referenceUrl: prepared.referenceUrl,
        priority: prepared.priority,
        dueDate: prepared.dueDate,
        publicationDate: prepared.publicationDate,
        deliveryDate: prepared.deliveryDate,
        slaResponseDueAt: prepared.slaResponseDueAt,
        slaResolutionDueAt: prepared.slaResolutionDueAt,
        resolvedAt:
          prepared.status === KanbanTaskStatus.OK ? new Date() : null,
        createdById: prepared.createdById,
        order: (maxOrder._max.order ?? -1) + 1,
        assignees: prepared.assigneeIds.length
          ? {
              create: prepared.assigneeIds.map((assigneeId) => ({
                userId: assigneeId,
              })),
            }
          : undefined,
      },
      include: this.taskInclude(),
    });
  }

  async finalizeNewTask(userId: string, taskId: string) {
    const task = await this.ensureTaskExists(taskId);
    const ensuredTask = await this.ensureCalendarEventForTask(
      task,
      userId,
      task.status,
    );

    await this.syncCalendarEventColor(ensuredTask.id);

    await this.logHistory(userId, ensuredTask.id, 'Tarefa criada');

    const assigneeIds = ensuredTask.assignees
      .map((assignee) => assignee.user?.id)
      .filter((id): id is string => Boolean(id));

    if (assigneeIds.length) {
      const names = ensuredTask.assignees
        .map((a) => a.user?.name)
        .filter((name): name is string => Boolean(name))
        .join(', ');
      await this.logHistory(userId, ensuredTask.id, `Atribuída a ${names}`);
      await this.notifications.notifyTaskAssigned(
        assigneeIds,
        ensuredTask.title,
        userId,
        { companyId: ensuredTask.companyId, taskId: ensuredTask.id },
      );
    }

    if (ensuredTask.assignedGroup) {
      await this.logHistory(
        userId,
        ensuredTask.id,
        `Grupo atribuído: ${ensuredTask.assignedGroup.name}`,
      );
    }

    return this.toTaskResponse(ensuredTask);
  }

  async updateTask(userId: string, role: string, id: string, dto: UpdateTaskDto) {
    const existing = await this.ensureTaskExists(id);
    assertKanbanTaskEditAccess(role, userId, existing);

    let resolvedStatus = dto.status ?? existing.status;
    let resolvedColumnId = dto.columnId ?? existing.columnId;

    if (dto.status) {
      const statusColumn = await this.resolveColumnForStatus(dto.status);
      if (statusColumn) resolvedColumnId = statusColumn.id;
      resolvedStatus = dto.status;
    } else if (dto.columnId) {
      const column = await this.ensureColumnExists(dto.columnId);
      if (column.statusKey) resolvedStatus = column.statusKey;
    }

    if (dto.assignedGroupId) {
      await this.ensureGroupExists(dto.assignedGroupId);
    }

    const shouldUpdateAssignees =
      dto.assigneeIds !== undefined || dto.assignedGroupId !== undefined;
    let nextAssigneeIds: string[] | undefined;

    if (shouldUpdateAssignees) {
      nextAssigneeIds = await this.resolveAssigneeIds({
        assigneeIds:
          dto.assigneeIds !== undefined
            ? dto.assigneeIds
            : existing.assignees.map((a) => a.userId),
        assignedGroupId:
          dto.assignedGroupId !== undefined
            ? dto.assignedGroupId
            : existing.assignedGroupId,
      });
      await this.validateAssignees(nextAssigneeIds);
    }

    if (dto.clientId !== undefined && dto.clientId !== null) {
      await this.ensureClientExists(dto.clientId);
    }

    let slaResponseDueAt: Date | undefined;
    let slaResolutionDueAt: Date | undefined;
    if (dto.priority && dto.priority !== existing.priority) {
      const dueDates = await this.slaService.computeDueDatesForPriority(
        dto.priority,
        existing.createdAt,
      );
      slaResponseDueAt = dueDates.slaResponseDueAt;
      slaResolutionDueAt = dueDates.slaResolutionDueAt;
    }

    const referenceUrlProvided =
      dto.referenceUrl !== undefined &&
      Boolean(dto.referenceUrl?.trim()) &&
      !existing.referenceUrl;
    if (
      referenceUrlProvided &&
      existing.status === KanbanTaskStatus.FALTA_GRAVAR &&
      !dto.status &&
      !dto.columnId
    ) {
      resolvedStatus = KanbanTaskStatus.PRODUCAO;
      const statusColumn = await this.resolveColumnForStatus(
        KanbanTaskStatus.PRODUCAO,
      );
      if (statusColumn) resolvedColumnId = statusColumn.id;
    }

    let resolvedAt: Date | null | undefined;
    if (resolvedStatus === KanbanTaskStatus.OK && existing.status !== KanbanTaskStatus.OK) {
      resolvedAt = new Date();
    } else if (
      resolvedStatus !== KanbanTaskStatus.OK &&
      existing.status === KanbanTaskStatus.OK
    ) {
      resolvedAt = null;
    }

    const nextContentType = dto.contentType ?? existing.contentType;
    let requestedProductionPhase = dto.productionPhase;
    if (
      dto.contentType &&
      dto.productionPhase === undefined &&
      resolvedStatus === KanbanTaskStatus.FALTA_GRAVAR &&
      contentTypeRequiresScript(dto.contentType) !==
        contentTypeRequiresScript(existing.contentType)
    ) {
      requestedProductionPhase = defaultProductionPhaseForContentType(
        dto.contentType,
      );
    }

    const resolvedProductionPhase = resolveProductionPhaseForStatus(
      resolvedStatus,
      existing.productionPhase,
      requestedProductionPhase,
      nextContentType,
    );
    this.assertValidProductionColumnTarget(
      resolvedStatus,
      resolvedProductionPhase,
    );

    await this.prisma.$transaction(async (tx) => {
      if (nextAssigneeIds) {
        await tx.kanbanTaskAssignee.deleteMany({ where: { taskId: id } });
        if (nextAssigneeIds.length > 0) {
          await tx.kanbanTaskAssignee.createMany({
            data: nextAssigneeIds.map((assigneeId) => ({
              taskId: id,
              userId: assigneeId,
            })),
          });
        }
      }

      return tx.kanbanTask.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          postCaption:
            dto.postCaption !== undefined
              ? dto.postCaption?.trim() || null
              : undefined,
          columnId: resolvedColumnId,
          status: resolvedStatus,
          productionPhase: resolvedProductionPhase,
          contentType: dto.contentType,
          clientId: dto.clientId,
          assignedGroupId:
            dto.assignedGroupId !== undefined
              ? dto.assignedGroupId
              : undefined,
          referenceUrl:
            dto.referenceUrl !== undefined ? dto.referenceUrl : undefined,
          priority: dto.priority,
          order: dto.order,
          dueDate:
            dto.dueDate !== undefined
              ? dto.dueDate
                ? new Date(dto.dueDate)
                : null
              : dto.deliveryDate !== undefined
                ? dto.deliveryDate
                  ? new Date(dto.deliveryDate)
                  : null
                : undefined,
          publicationDate:
            dto.publicationDate !== undefined
              ? dto.publicationDate
                ? new Date(dto.publicationDate)
                : null
              : undefined,
          deliveryDate:
            dto.deliveryDate !== undefined
              ? dto.deliveryDate
                ? new Date(dto.deliveryDate)
                : null
              : dto.dueDate !== undefined
                ? dto.dueDate
                  ? new Date(dto.dueDate)
                  : null
                : undefined,
          slaResponseDueAt,
          slaResolutionDueAt,
          ...(referenceUrlProvided &&
          (existing.internalReviewStatus === InternalReviewStatus.NOT_REQUIRED ||
            existing.internalReviewStatus === InternalReviewStatus.REJECTED)
            ? { internalReviewStatus: InternalReviewStatus.PENDING }
            : {}),
          resolvedAt,

        },
        include: this.taskInclude(),
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    await this.syncCalendarEventColor(id);

    const updated = await this.ensureTaskExists(id);
    if (dto.postCaption !== undefined && updated.contentPostId) {
      await this.syncContentPostCopy(
        updated.contentPostId,
        this.resolvePostCopy(updated),
      );
    }
    const withCalendar = await this.ensureCalendarEventForTask(
      updated,
      userId,
      updated.status,
    );
    await this.logTaskChanges(userId, existing, withCalendar, dto);

    const becamePending =
      referenceUrlProvided &&
      (existing.internalReviewStatus === InternalReviewStatus.NOT_REQUIRED ||
        existing.internalReviewStatus === InternalReviewStatus.REJECTED);
    if (becamePending) {
      await this.notifications.notifyInternalApprovalPending({
        companyId: withCalendar.companyId,
        taskId: withCalendar.id,
        taskTitle: withCalendar.title,
        actorId: userId,
      });
    }

    return this.toTaskResponse(withCalendar);
  }

  async updateTaskStatus(
    userId: string,
    role: string,
    id: string,
    dto: UpdateTaskStatusDto,
  ) {
    const existing = await this.ensureTaskExists(id);
    assertKanbanTaskEditAccess(role, userId, existing);

    if (existing.status === dto.status) {
      return this.toTaskResponse(existing);
    }

    const statusColumn = await this.resolveColumnForStatus(dto.status);
    if (!statusColumn) {
      throw new BadRequestException('Status column not found');
    }

    const maxOrder = await this.prisma.kanbanTask.aggregate({
      where: { columnId: statusColumn.id },
      _max: { order: true },
    });

    const resolvedProductionPhase = resolveProductionPhaseForStatus(
      dto.status,
      existing.productionPhase,
      undefined,
      existing.contentType,
    );
    this.assertValidProductionColumnTarget(
      dto.status,
      resolvedProductionPhase,
    );

    let resolvedAt: Date | null | undefined;
    if (
      dto.status === KanbanTaskStatus.OK &&
      existing.status !== KanbanTaskStatus.OK
    ) {
      resolvedAt = new Date();
    } else if (
      dto.status !== KanbanTaskStatus.OK &&
      existing.status === KanbanTaskStatus.OK
    ) {
      resolvedAt = null;
    }

    await this.prisma.kanbanTask.update({
      where: { id },
      data: {
        status: dto.status,
        columnId: statusColumn.id,
        productionPhase: resolvedProductionPhase,
        order: (maxOrder._max.order ?? -1) + 1,
        ...(resolvedAt !== undefined ? { resolvedAt } : {}),
      },
    });

    if (dto.status === KanbanTaskStatus.JHONATAN_APROVOU) {
      await this.publishTaskForClientReview(id, userId, {
        internalReviewStatus: InternalReviewStatus.APPROVED,
        internalReviewNote: existing.internalReviewNote ?? null,
      });
    }

    await this.syncCalendarEventColor(id);
    await this.logHistory(
      userId,
      id,
      `Status alterado para ${STATUS_LABELS[dto.status]}`,
    );

    return this.toTaskResponse(await this.ensureTaskExists(id));
  }

  async moveTask(userId: string, role: string, id: string, dto: MoveTaskDto) {
    const task = await this.ensureTaskExists(id);
    assertKanbanTaskEditAccess(role, userId, task);
    const targetColumn = await this.ensureColumnExists(dto.columnId);
    const sourceColumnId = task.columnId;
    const sourceOrder = task.order;
    const targetOrder = dto.order;
    const newStatus = targetColumn.statusKey ?? task.status;
    const resolvedProductionPhase = resolveProductionPhaseForStatus(
      newStatus,
      task.productionPhase,
      undefined,
      task.contentType,
    );
    this.assertValidProductionColumnTarget(newStatus, resolvedProductionPhase);

    await this.prisma.$transaction(async (tx) => {
      if (sourceColumnId === dto.columnId) {
        if (targetOrder < sourceOrder) {
          await tx.kanbanTask.updateMany({
            where: {
              columnId: sourceColumnId,
              order: { gte: targetOrder, lt: sourceOrder },
            },
            data: { order: { increment: 1 } },
          });
        } else if (targetOrder > sourceOrder) {
          await tx.kanbanTask.updateMany({
            where: {
              columnId: sourceColumnId,
              order: { gt: sourceOrder, lte: targetOrder },
            },
            data: { order: { decrement: 1 } },
          });
        }
      } else {
        await tx.kanbanTask.updateMany({
          where: {
            columnId: sourceColumnId,
            order: { gt: sourceOrder },
          },
          data: { order: { decrement: 1 } },
        });

        await tx.kanbanTask.updateMany({
          where: {
            columnId: dto.columnId,
            order: { gte: targetOrder },
            id: { not: id },
          },
          data: { order: { increment: 1 } },
        });
      }

      const resolvedAt =
        newStatus === KanbanTaskStatus.OK
          ? new Date()
          : task.status === KanbanTaskStatus.OK
            ? null
            : undefined;

      await tx.kanbanTask.update({
        where: { id },
        data: {
          columnId: dto.columnId,
          order: targetOrder,
          status: newStatus,
          productionPhase: resolvedProductionPhase,
          ...(resolvedAt !== undefined ? { resolvedAt } : {}),
        },
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    await this.syncCalendarEventColor(id);

    if (
      newStatus === KanbanTaskStatus.JHONATAN_APROVOU &&
      task.status !== KanbanTaskStatus.JHONATAN_APROVOU
    ) {
      await this.publishTaskForClientReview(id, userId, {
        internalReviewStatus: InternalReviewStatus.APPROVED,
        internalReviewNote: task.internalReviewNote ?? null,
      });
    }

    const updated = await this.ensureTaskExists(id);

    if (task.columnId !== dto.columnId) {
      await this.logHistory(
        userId,
        id,
        `Movida para ${targetColumn.title}`,
      );
    }

    return this.toTaskResponse(updated);
  }

  async updateInternalReview(
    userId: string,
    role: string,
    taskId: string,
    dto: InternalReviewDto,
  ) {
    const status = this.mapInternalReviewAction(dto.status);

    if (status === InternalReviewStatus.PENDING) {
      throw new BadRequestException(
        'O envio manual para revisão interna foi removido. Anexe a entrega e use a aprovação interna da Delivery.',
      );
    }

    if (status === InternalReviewStatus.APPROVED) {
      await this.applyInternalApproval(taskId, userId, role, dto.note);
      return this.toTaskResponse(await this.ensureTaskExists(taskId));
    }

    if (status === InternalReviewStatus.REJECTED && !dto.note?.trim()) {
      throw new BadRequestException(
        'Motivo da rejeição é obrigatório para revisão interna',
      );
    }

    if (status === InternalReviewStatus.REJECTED) {
      assertCanPerformInternalApproval(role);
    }

    const existing = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId },
      select: { contentPostId: true, companyId: true, title: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const column = await this.resolveColumnForStatus(
      KanbanTaskStatus.JHONATAN_REPROVA,
    );

    await this.prisma.kanbanTask.update({
      where: { id: taskId },
      data: {
        internalReviewStatus: InternalReviewStatus.REJECTED,
        internalReviewNote: dto.note?.trim() ?? null,
        status: KanbanTaskStatus.JHONATAN_REPROVA,
        ...(column ? { columnId: column.id } : {}),
      },
    });

    if (existing.contentPostId) {
      await this.prisma.contentPost.update({
        where: { id: existing.contentPostId },
        data: {
          internalReviewStatus: InternalReviewStatus.REJECTED,
          internalReviewNote: dto.note?.trim() ?? null,
        },
      });
    }

    await this.deliverablesService.markRequiresAdjustment(taskId);
    await this.logHistory(
      userId,
      taskId,
      'Revisão interna: rejeitada internamente',
    );

    await this.notifications.notifyTaskReproved({
      companyId: existing.companyId,
      taskId,
      taskTitle: existing.title,
      actorId: userId,
      reason: dto.note,
    });

    return this.toTaskResponse(await this.ensureTaskExists(taskId));
  }

  async applyInternalApproval(
    taskId: string,
    userId: string,
    role: string,
    note?: string | null,
  ) {
    assertCanPerformInternalApproval(role);

    const existing = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        contentPostId: true,
        internalReviewStatus: true,
        isBypassingInternalReview: true,
      },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const assetCount = await this.prisma.kanbanTaskAsset.count({
      where: { taskId },
    });
    if (assetCount === 0) {
      throw new BadRequestException(
        'É necessário anexar pelo menos uma entrega antes da aprovação interna',
      );
    }

    if (
      !existing.isBypassingInternalReview &&
      existing.internalReviewStatus !== InternalReviewStatus.PENDING &&
      existing.internalReviewStatus !== InternalReviewStatus.APPROVED
    ) {
      throw new BadRequestException(
        'A tarefa precisa estar aguardando aprovação interna',
      );
    }

    const column = await this.resolveColumnForStatus(
      KanbanTaskStatus.JHONATAN_APROVOU,
    );

    await this.prisma.kanbanTask.update({
      where: { id: taskId },
      data: {
        internalReviewStatus: InternalReviewStatus.APPROVED,
        internalReviewNote: note?.trim() ?? null,
        status: KanbanTaskStatus.JHONATAN_APROVOU,
        ...(column ? { columnId: column.id } : {}),
      },
    });

    await this.publishTaskForClientReview(taskId, userId, {
      internalReviewStatus: InternalReviewStatus.APPROVED,
      internalReviewNote: note?.trim() ?? null,
    });

    await this.deliverablesService.markWaitingClientApproval(taskId);
    await this.logHistory(
      userId,
      taskId,
      'Revisão interna: aprovada (Aprovar Jhonatan)',
    );
  }

  async applyInternalAdjustment(
    taskId: string,
    userId?: string | null,
    reason?: string | null,
  ) {
    const existing = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { id: true, contentPostId: true, companyId: true, title: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const column = await this.resolveColumnForStatus(
      KanbanTaskStatus.JHONATAN_REPROVA,
    );

    await this.prisma.kanbanTask.update({
      where: { id: taskId },
      data: {
        status: KanbanTaskStatus.JHONATAN_REPROVA,
        internalReviewStatus: InternalReviewStatus.REJECTED,
        internalReviewNote: reason?.trim() || null,
        resolvedAt: null,
        ...(column ? { columnId: column.id } : {}),
      },
    });

    if (existing.contentPostId) {
      await this.prisma.contentPost.update({
        where: { id: existing.contentPostId },
        data: {
          internalReviewStatus: InternalReviewStatus.REJECTED,
          internalReviewNote: reason?.trim() || null,
        },
      });
    }

    await this.deliverablesService.markRequiresAdjustment(taskId);
    await this.logHistoryIfUser(
      userId,
      taskId,
      'Revisão interna: ajustes solicitados na entrega',
    );

    await this.notifications.notifyTaskReproved({
      companyId: existing.companyId,
      taskId,
      taskTitle: existing.title,
      actorId: userId,
      reason,
    });
  }

  async applyClientRejection(
    taskId: string,
    userId?: string | null,
    reason?: string | null,
  ) {
    const existing = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { id: true, contentPostId: true, companyId: true, title: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const column = await this.resolveColumnForStatus(
      KanbanTaskStatus.JHONATAN_REPROVA,
    );

    await this.prisma.kanbanTask.update({
      where: { id: taskId },
      data: {
        status: KanbanTaskStatus.JHONATAN_REPROVA,
        isBypassingInternalReview: true,
        internalReviewStatus: InternalReviewStatus.REJECTED,
        internalReviewNote: reason?.trim() || null,
        resolvedAt: null,
        ...(column ? { columnId: column.id } : {}),
      },
    });

    if (existing.contentPostId) {
      await this.prisma.contentPost.update({
        where: { id: existing.contentPostId },
        data: {
          status: ContentPostStatus.REJECTED,
          internalReviewStatus: InternalReviewStatus.REJECTED,
          internalReviewNote: reason?.trim() || null,
        },
      });
    }

    await this.deliverablesService.markRequiresAdjustment(taskId);
    await this.logHistoryIfUser(
      userId,
      taskId,
      'Cliente reprovou: movida para Necessita Ajuste',
    );

    await this.notifications.notifyTaskReproved({
      companyId: existing.companyId,
      taskId,
      taskTitle: existing.title,
      actorId: userId,
      reason,
    });
  }

  async applyClientApproval(taskId: string, userId?: string | null) {
    const existing = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { id: true, contentPostId: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const column = await this.resolveColumnForStatus(KanbanTaskStatus.OK);

    await this.prisma.kanbanTask.update({
      where: { id: taskId },
      data: {
        status: KanbanTaskStatus.OK,
        isBypassingInternalReview: false,
        resolvedAt: new Date(),
        ...(column ? { columnId: column.id } : {}),
      },
    });

    if (existing.contentPostId) {
      await this.prisma.contentPost.update({
        where: { id: existing.contentPostId },
        data: { status: ContentPostStatus.APPROVED },
      });
    }

    await this.deliverablesService.markClientApproved(taskId);
    await this.logHistoryIfUser(
      userId,
      taskId,
      'Cliente aprovou: movida para OK',
    );
  }

  async uploadTaskAsset(
    userId: string,
    role: string,
    taskId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const task = await this.ensureTaskExists(taskId);
    assertKanbanTaskEditAccess(role, userId, task);

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/quicktime',
    ];

    if (!allowed.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Unsupported file type');
    }

    const fileUrl = await this.persistTaskAssetFile(task, file);
    const trimmedCaption = caption?.trim() || null;

    const asset = await this.prisma.kanbanTaskAsset.create({
      data: {
        taskId,
        fileName: file.originalname,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        caption: trimmedCaption,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: userSelect } },
    });

    if (task.isBypassingInternalReview) {
      const column = await this.resolveColumnForStatus(
        KanbanTaskStatus.JHONATAN_APROVOU,
      );

      await this.prisma.kanbanTask.update({
        where: { id: taskId },
        data: {
          status: KanbanTaskStatus.JHONATAN_APROVOU,
          internalReviewStatus: InternalReviewStatus.APPROVED,
          ...(column ? { columnId: column.id } : {}),
        },
      });

      await this.publishTaskForClientReview(taskId, userId, {
        internalReviewStatus: InternalReviewStatus.APPROVED,
        internalReviewNote: task.internalReviewNote ?? null,
      });

      await this.logHistory(
        userId,
        taskId,
        `Entregável reenviado (bypass Jhonatan): ${asset.fileName}`,
      );
      await this.deliverablesService.syncFromKanbanTask(taskId);
      await this.deliverablesService.markWaitingClientApproval(taskId);
    } else {
      const nextStatus = KanbanTaskStatus.PRODUCAO;
      const column = await this.resolveColumnForStatus(nextStatus);

      await this.prisma.kanbanTask.update({
        where: { id: taskId },
        data: {
          status: nextStatus,
          ...(column ? { columnId: column.id } : {}),
          ...(task.internalReviewStatus === InternalReviewStatus.NOT_REQUIRED ||
          task.internalReviewStatus === InternalReviewStatus.REJECTED
            ? { internalReviewStatus: InternalReviewStatus.PENDING }
            : {}),
        },
      });

      if (task.contentPostId) {
        await this.prisma.contentPost.update({
          where: { id: task.contentPostId },
          data: {
            ...(task.internalReviewStatus ===
              InternalReviewStatus.NOT_REQUIRED ||
            task.internalReviewStatus === InternalReviewStatus.REJECTED
              ? { internalReviewStatus: InternalReviewStatus.PENDING }
              : {}),
          },
        });
      }

      await this.logHistory(
        userId,
        taskId,
        `Entregável adicionado: ${asset.fileName}`,
      );
      await this.deliverablesService.syncFromKanbanTask(taskId);

      const becamePending =
        task.internalReviewStatus === InternalReviewStatus.NOT_REQUIRED ||
        task.internalReviewStatus === InternalReviewStatus.REJECTED;
      if (becamePending) {
        await this.notifications.notifyInternalApprovalPending({
          companyId: task.companyId,
          taskId,
          taskTitle: task.title,
          actorId: userId,
        });
      }
    }

    return {
      id: asset.id,
      fileName: asset.fileName,
      fileUrl: asset.fileUrl,
      fileType: asset.fileType,
      fileSize: asset.fileSize,
      caption: asset.caption,
      uploadedAt: asset.uploadedAt.toISOString(),
      uploadedBy: asset.uploadedBy,
    };
  }

  async deleteTaskAsset(
    userId: string,
    role: string,
    taskId: string,
    assetId: string,
  ) {
    const task = await this.ensureTaskExists(taskId);
    assertKanbanTaskEditAccess(role, userId, task);

    const asset = await this.prisma.kanbanTaskAsset.findFirst({
      where: { id: assetId, taskId },
    });

    if (!asset) {
      throw new NotFoundException('Task asset not found');
    }

    await this.prisma.kanbanTaskAsset.delete({ where: { id: assetId } });
    await this.logHistory(userId, taskId, `Entregável removido: ${asset.fileName}`);
    await this.deliverablesService.syncFromKanbanTask(taskId);
  }

  async deleteTask(userId: string, role: string, id: string) {
    const task = await this.ensureTaskExists(id);
    assertKanbanTaskEditAccess(role, userId, task);
    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.kanbanTask.update({
        where: { id },
        data: {
          deletedAt,
          deletedById: userId,
        },
      }),
      this.prisma.deletionHistory.create({
        data: {
          companyId: task.companyId,
          entityType: 'KANBAN_TASK',
          entityId: task.id,
          title: task.title,
          metadata: {
            status: task.status,
            columnId: task.columnId,
            clientId: task.clientId,
          },
          deletedById: userId,
          deletedAt,
        },
      }),
    ]);
  }

  async clearAllTasks(userId: string, role: string) {
    if (!canEditAllKanban(role)) {
      throw new ForbiddenException('Insufficient permissions to clear all tasks');
    }
    const tasks = await this.prisma.kanbanTask.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        companyId: true,
        title: true,
        status: true,
        columnId: true,
        clientId: true,
      },
    });

    if (tasks.length === 0) {
      return { deletedCount: 0 };
    }

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.kanbanTask.updateMany({
        where: { id: { in: tasks.map((task) => task.id) } },
        data: {
          deletedAt,
          deletedById: userId,
        },
      }),
      this.prisma.deletionHistory.createMany({
        data: tasks.map((task) => ({
          companyId: task.companyId,
          entityType: 'KANBAN_TASK' as const,
          entityId: task.id,
          title: task.title,
          metadata: {
            status: task.status,
            columnId: task.columnId,
            clientId: task.clientId,
          },
          deletedById: userId,
          deletedAt,
        })),
      }),
    ]);

    return { deletedCount: tasks.length };
  }

  async getDeletionHistory(query: QueryDeletionHistoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.deletionHistory.count(),
      this.prisma.deletionHistory.findMany({
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: {
          deletedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        title: item.title,
        metadata: item.metadata,
        deletedAt: item.deletedAt.toISOString(),
        deletedBy: item.deletedBy,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getComments(taskId: string) {
    await this.ensureTaskExists(taskId);

    const comments = await this.prisma.taskComment.findMany({
      where: { taskId },
      include: { user: { select: userSelect } },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    }));
  }

  async createComment(
    userId: string,
    taskId: string,
    dto: CreateCommentDto,
  ) {
    await this.ensureTaskExists(taskId);

    await this.prisma.kanbanTask.updateMany({
      where: { id: taskId, firstResponseAt: null },
      data: { firstResponseAt: new Date() },
    });

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: dto.content,
      },
      include: { user: { select: userSelect } },
    });

    await this.logHistory(userId, taskId, 'Comentário adicionado');

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    };
  }

  async getHistory(taskId: string) {
    await this.ensureTaskExists(taskId);

    const history = await this.prisma.taskHistory.findMany({
      where: { taskId },
      include: { user: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });

    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      createdAt: entry.createdAt.toISOString(),
      user: entry.user,
    }));
  }

  private async ensureStatusColumns() {
    const existing = await this.prisma.kanbanColumn.findMany();

    for (const def of KANBAN_STATUS_DEFINITIONS) {
      const match = existing.find((column) => column.statusKey === def.status);
      if (match) {
        await this.prisma.kanbanColumn.update({
          where: { id: match.id },
          data: {
            title: def.title,
            color: def.color,
            order: def.order,
          },
        });
      } else {
        await this.prisma.kanbanColumn.create({
          data: {
            title: def.title,
            color: def.color,
            order: def.order,
            type: KanbanColumnType.CUSTOM,
            statusKey: def.status,
          },
        });
      }
    }

    const statusColumns = await this.prisma.kanbanColumn.findMany({
      where: { statusKey: { not: null } },
    });

    const activeStatusKeys = new Set(
      KANBAN_STATUS_DEFINITIONS.map((def) => def.status),
    );
    const deprecatedColumns = statusColumns.filter(
      (column) => column.statusKey && !activeStatusKeys.has(column.statusKey),
    );

    if (deprecatedColumns.length > 0) {
      const fallbackColumn = statusColumns.find(
        (column) => column.statusKey === KanbanTaskStatus.JHONATAN_REPROVA,
      );

      for (const deprecated of deprecatedColumns) {
        if (fallbackColumn) {
          await this.prisma.kanbanTask.updateMany({
            where: { columnId: deprecated.id },
            data: {
              columnId: fallbackColumn.id,
              status: KanbanTaskStatus.JHONATAN_REPROVA,
            },
          });
        }

        await this.prisma.kanbanColumn.delete({ where: { id: deprecated.id } });
      }

      await this.prisma.kanbanTask.updateMany({
        where: { status: KanbanTaskStatus.CLIENTE_REPROVOU },
        data: fallbackColumn
          ? {
              status: KanbanTaskStatus.JHONATAN_REPROVA,
              columnId: fallbackColumn.id,
            }
          : { status: KanbanTaskStatus.JHONATAN_REPROVA },
      });
    }

    const legacyColumns = existing.filter((column) => !column.statusKey);
    if (legacyColumns.length > 0) {
      const typeToStatus: Partial<Record<KanbanColumnType, KanbanTaskStatus>> = {
        [KanbanColumnType.TO_DO]: KanbanTaskStatus.PRODUCAO,
        [KanbanColumnType.IN_PROGRESS]: KanbanTaskStatus.PRODUCAO,
        [KanbanColumnType.DONE]: KanbanTaskStatus.OK,
        [KanbanColumnType.CUSTOM]: KanbanTaskStatus.PRODUCAO,
      };

      for (const legacy of legacyColumns) {
        const targetStatus =
          legacy.type
            ? (typeToStatus[legacy.type] ?? DEFAULT_TASK_STATUS)
            : DEFAULT_TASK_STATUS;
        const targetColumn = statusColumns.find(
          (column) => column.statusKey === targetStatus,
        );
        if (!targetColumn) continue;

        await this.prisma.kanbanTask.updateMany({
          where: { columnId: legacy.id },
          data: {
            columnId: targetColumn.id,
            status: targetStatus,
          },
        });
      }
    }

    const tasks = await this.prisma.kanbanTask.findMany({
      include: { column: true },
    });

    for (const task of tasks) {
      if (
        task.column.statusKey &&
        task.status !== task.column.statusKey
      ) {
        await this.prisma.kanbanTask.update({
          where: { id: task.id },
          data: { status: task.column.statusKey },
        });
      }
    }
  }

  private async resolveColumnForStatus(status: KanbanTaskStatus) {
    return this.prisma.kanbanColumn.findFirst({
      where: { statusKey: status },
    });
  }

  async applyClientReviewOutcome(
    contentPostId: string,
    approved: boolean,
    reason?: string | null,
  ) {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId, deletedAt: null },
      select: { id: true },
    });
    if (!task) return;

    if (approved) {
      await this.applyClientApproval(task.id);
    } else {
      await this.applyClientRejection(task.id, null, reason);
    }
  }

  private async ensureCalendarEventForTask(
    task: TaskWithRelations,
    userId: string,
    status: KanbanTaskStatus,
  ): Promise<TaskWithRelations> {
    if (!task.publicationDate) {
      return task;
    }

    if (task.calendarEventId) {
      await this.syncLinkedCalendarEventDates(task);
      return task;
    }

    if (task.contentPostId) {
      const existing = await this.prisma.calendarEvent.findFirst({
        where: { contentPostId: task.contentPostId },
        select: { id: true },
      });

      if (existing) {
        const linked = await this.prisma.kanbanTask.update({
          where: { id: task.id },
          data: { calendarEventId: existing.id },
          include: this.taskInclude(),
        });
        await this.syncLinkedCalendarEventDates(linked);
        return linked;
      }
    }

    const startAt = new Date(task.publicationDate);
    const endAt = task.deliveryDate
      ? new Date(task.deliveryDate)
      : new Date(startAt.getTime() + 60 * 60 * 1000);

    const primaryAssigneeId = task.assignees[0]?.userId ?? null;

    const event = await this.prisma.calendarEvent.create({
      data: {
        title: task.title,
        description: task.description,
        startAt,
        endAt,
        category: EventCategory.DEADLINE,
        color: STATUS_COLORS[status],
        referenceUrl: task.referenceUrl,
        clientId: task.clientId,
        contentPostId: task.contentPostId,
        createdById: userId,
        assigneeId: primaryAssigneeId,
        assignedGroupId: task.assignedGroupId,
        isPending: false,
      },
    });

    return this.prisma.kanbanTask.update({
      where: { id: task.id },
      data: { calendarEventId: event.id },
      include: this.taskInclude(),
    });
  }

  private async syncLinkedCalendarEventDates(task: {
    calendarEventId: string | null;
    title: string;
    description: string | null;
    publicationDate: Date | null;
    deliveryDate: Date | null;
  }) {
    if (!task.calendarEventId || !task.publicationDate) {
      return;
    }

    const startAt = new Date(task.publicationDate);
    const endAt = task.deliveryDate
      ? new Date(task.deliveryDate)
      : new Date(startAt.getTime() + 60 * 60 * 1000);

    await this.prisma.calendarEvent.update({
      where: { id: task.calendarEventId },
      data: {
        title: task.title,
        description: task.description,
        startAt,
        endAt,
      },
    });
  }

  private async syncCalendarEventColor(taskId: string) {
    const task = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId },
      select: {
        calendarEventId: true,
        contentPostId: true,
        status: true,
        productionPhase: true,
      },
    });

    const color = resolveTaskDisplayColor(
      task?.status ?? DEFAULT_TASK_STATUS,
      task?.productionPhase,
      STATUS_COLORS,
    );

    if (task?.calendarEventId) {
      await this.prisma.calendarEvent.update({
        where: { id: task.calendarEventId },
        data: { color },
      });
      return;
    }

    if (task?.contentPostId) {
      await this.prisma.calendarEvent.updateMany({
        where: { contentPostId: task.contentPostId },
        data: { color },
      });
    }
  }

  private assertValidProductionColumnTarget(
    status: KanbanTaskStatus,
    productionPhase: ProductionPhase | null,
  ) {
    if (status !== KanbanTaskStatus.FALTA_GRAVAR) {
      return;
    }

    if (!isProductionPhase(productionPhase)) {
      throw new BadRequestException(
        'A coluna Em produção aceita apenas indicadores Roteiro ou Em gravação',
      );
    }
  }

  private taskInclude() {
    return taskInclude;
  }

  private async ensureColumnExists(id: string) {
    const column = await this.prisma.kanbanColumn.findUnique({
      where: { id },
    });
    if (!column) throw new NotFoundException('Column not found');
    return column;
  }

  private async persistTaskAssetFile(
    task: { id: string; clientId: string | null; companyId: string },
    file: Express.Multer.File,
  ): Promise<string> {
    if (!this.storage.isConfigured) {
      return `/uploads/${file.filename}`;
    }

    const bucket = this.storage.getDeliverablesBucket();
    const extension = extname(file.originalname) || '';
    const ownerSegment = task.clientId ?? task.companyId;
    const storagePath = `${ownerSegment}/${task.id}/${randomUUID()}${extension}`;
    const body = readFileSync(file.path);

    const fileUrl = await this.storage.uploadDeliverableObject({
      bucket,
      path: storagePath,
      body,
      contentType: file.mimetype,
    });

    try {
      unlinkSync(file.path);
    } catch {
      // ignore temp file cleanup errors
    }

    return fileUrl;
  }

  private async ensureTaskExists(id: string): Promise<TaskWithRelations> {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id, deletedAt: null },
      include: this.taskInclude(),
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async ensureGroupExists(groupId: string) {
    const group = await this.prisma.userGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) {
      throw new BadRequestException('Grupo não encontrado');
    }
    return group;
  }

  private async resolveGroupMemberIds(groupId: string): Promise<string[]> {
    const group = await this.prisma.userGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { select: { userId: true } },
        users: { select: { id: true } },
      },
    });

    if (!group) {
      throw new BadRequestException('Grupo não encontrado');
    }

    const ids = new Set<string>();
    for (const member of group.members) ids.add(member.userId);
    for (const user of group.users) ids.add(user.id);
    return [...ids];
  }

  private async resolveAssigneeIds(input: {
    assigneeIds?: string[] | null;
    assignedGroupId?: string | null;
  }): Promise<string[]> {
    const ids = new Set<string>();

    for (const assigneeId of input.assigneeIds ?? []) {
      ids.add(assigneeId);
    }

    if (input.assignedGroupId) {
      const groupMemberIds = await this.resolveGroupMemberIds(
        input.assignedGroupId,
      );
      for (const memberId of groupMemberIds) {
        ids.add(memberId);
      }
    }

    return [...ids];
  }

  private async validateAssignees(assigneeIds?: string[]) {
    if (!assigneeIds?.length) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      include: { role: true },
    });

    if (users.length !== assigneeIds.length) {
      throw new BadRequestException('One or more assignees were not found');
    }

    if (users.some((user) => user.role.name === RoleName.CLIENT || user.role.name === RoleName.EXTERNAL_CLIENT_CRM)) {
      throw new BadRequestException(
        'Usuários com perfil de cliente não podem ser responsáveis por tarefas',
      );
    }
  }

  private async syncTaskAssetsToContentPost(
    taskId: string,
    contentPostId: string,
  ) {
    const assets = await this.prisma.kanbanTaskAsset.findMany({
      where: { taskId },
      orderBy: { uploadedAt: 'asc' },
    });

    await this.prisma.contentAttachment.deleteMany({
      where: { postId: contentPostId },
    });

    if (!assets.length) return;

    await this.prisma.contentAttachment.createMany({
      data: assets.map((asset) => ({
        postId: contentPostId,
        name: asset.caption?.trim() || asset.fileName,
        url: asset.fileUrl,
        mimeType: asset.fileType,
      })),
    });
  }

  async publishTaskForClientReview(
    taskId: string,
    userId: string,
    review: {
      internalReviewStatus: InternalReviewStatus;
      internalReviewNote: string | null;
    },
  ) {
    const task = await this.prisma.kanbanTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        postCaption: true,
        referenceUrl: true,
        clientId: true,
        contentPostId: true,
        calendarEventId: true,
        dueDate: true,
        createdById: true,
        assignees: { select: { userId: true }, take: 1 },
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (!task.clientId) {
      throw new BadRequestException(
        'Vincule um cliente à tarefa antes de enviar para aprovação do cliente',
      );
    }

    let contentPostId = task.contentPostId;

    if (!contentPostId) {
      const post = await this.prisma.contentPost.create({
        data: {
          title: task.title,
          platform: ContentPlatform.INSTAGRAM,
          format: ContentPostFormat.STATIC,
          copy: this.resolvePostCopy(task),
          referenceUrl: task.referenceUrl,
          scheduledDate: task.dueDate,
          status: ContentPostStatus.PENDING_APPROVAL,
          internalReviewStatus: review.internalReviewStatus,
          internalReviewNote: review.internalReviewNote,
          clientId: task.clientId,
          userId: task.createdById || userId,
          assigneeId: task.assignees[0]?.userId ?? null,
        },
        select: { id: true },
      });
      contentPostId = post.id;

      await this.prisma.kanbanTask.update({
        where: { id: taskId },
        data: { contentPostId },
      });

      if (task.calendarEventId) {
        await this.prisma.calendarEvent.update({
          where: { id: task.calendarEventId },
          data: { contentPostId },
        });
      }
    } else {
      await this.prisma.contentPost.update({
        where: { id: contentPostId },
        data: {
          title: task.title,
          copy: this.resolvePostCopy(task),
          referenceUrl: task.referenceUrl,
          scheduledDate: task.dueDate,
          status: ContentPostStatus.PENDING_APPROVAL,
          internalReviewStatus: review.internalReviewStatus,
          internalReviewNote: review.internalReviewNote,
        },
      });
    }

    await this.syncTaskAssetsToContentPost(taskId, contentPostId);
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, isActive: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    if (!client.isActive) {
      throw new BadRequestException('Client is deactivated');
    }
  }

  private async logHistory(userId: string, taskId: string, action: string) {
    await this.prisma.taskHistory.create({
      data: { userId, taskId, action },
    });
  }

  private async logHistoryIfUser(
    userId: string | null | undefined,
    taskId: string,
    action: string,
  ) {
    if (!userId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return;
    await this.logHistory(userId, taskId, action);
  }

  private async logTaskChanges(
    userId: string,
    before: TaskWithRelations | null | undefined,
    after: TaskWithRelations | null | undefined,
    dto: UpdateTaskDto | null | undefined,
  ) {
    if (!before?.id || !after?.id || !dto) {
      return;
    }

    const logs: string[] = [];
    const beforeAssignees = before.assignees ?? [];
    const afterAssignees = after.assignees ?? [];

    if (dto.title && dto.title !== before.title) {
      logs.push(`Título atualizado para "${dto.title}"`);
    }

    if (dto.priority && dto.priority !== before.priority) {
      logs.push(
        `Prioridade alterada para ${PRIORITY_LABELS[dto.priority]}`,
      );
    }

    if (dto.columnId && dto.columnId !== before.columnId) {
      logs.push(`Movida para ${after.column?.title ?? 'coluna atualizada'}`);
    }

    if (dto.status && dto.status !== before.status) {
      logs.push(
        `Status alterado para ${STATUS_LABELS[dto.status]}`,
      );
    }

    if (dto.assigneeIds) {
      const beforeIds = beforeAssignees
        .map((a) => a.user?.id)
        .filter((id): id is string => Boolean(id))
        .sort();
      const afterIds = afterAssignees
        .map((a) => a.user?.id)
        .filter((id): id is string => Boolean(id))
        .sort();
      if (beforeIds.join(',') !== afterIds.join(',')) {
        const names =
          afterAssignees
            .map((a) => a.user?.name)
            .filter((name): name is string => Boolean(name))
            .join(', ') || 'ninguém';
        logs.push(`Responsáveis atualizados: ${names}`);

        const newAssignees = afterIds.filter((id) => !beforeIds.includes(id));
        if (newAssignees.length > 0) {
          await this.notifications.notifyTaskAssigned(
            newAssignees,
            after.title,
            userId,
            { companyId: after.companyId, taskId: after.id },
          );
        }
      }
    }

    if (dto.dueDate !== undefined) {
      logs.push('Data de prazo atualizada');
    }

    if (dto.publicationDate !== undefined) {
      logs.push('Data de publicação atualizada');
    }

    if (dto.deliveryDate !== undefined) {
      logs.push('Data de entrega atualizada');
    }

    for (const action of logs) {
      await this.logHistory(userId, before.id, action);
    }
  }

  private toColumnResponse(column: KanbanColumn) {
    return {
      id: column.id,
      title: column.title,
      order: column.order,
      color: column.color,
      type: column.type
        ? (column.type.toLowerCase() as
            | 'to_do'
            | 'in_progress'
            | 'done'
            | 'custom')
        : null,
      statusKey: column.statusKey
        ? statusToApi(column.statusKey)
        : null,
    };
  }

  private toTaskResponse(task: TaskWithRelations) {
    const slaStatus = this.slaService.computeTaskSlaStatus(task);

    return {
      ...toUnifiedTaskCore(task),
      postCaption: task.postCaption,
      referenceUrl: task.referenceUrl,
      columnId: task.columnId,
      column: task.column ? this.toColumnResponse(task.column) : null,
      contentPostId: task.contentPostId,
      calendarEventId: task.calendarEventId,
      internalReviewStatus: task.internalReviewStatus.toLowerCase() as
        | 'not_required'
        | 'pending'
        | 'approved'
        | 'rejected',
      internalReviewNote: task.internalReviewNote,
      isBypassingInternalReview: task.isBypassingInternalReview,
      priority: task.priority.toLowerCase() as
        | 'critical'
        | 'high'
        | 'medium'
        | 'low'
        | 'planned',
      order: task.order,
      slaResponseDueAt: task.slaResponseDueAt?.toISOString() ?? null,
      slaResolutionDueAt: task.slaResolutionDueAt?.toISOString() ?? null,
      firstResponseAt: task.firstResponseAt?.toISOString() ?? null,
      resolvedAt: task.resolvedAt?.toISOString() ?? null,
      slaStatus,
      assignedGroupId: task.assignedGroupId,
      assignedGroup: task.assignedGroup
        ? {
            id: task.assignedGroup.id,
            name: task.assignedGroup.name,
            color: task.assignedGroup.color,
          }
        : null,
      assignees: (task.assignees ?? [])
        .map((a) => a.user)
        .filter((user): user is NonNullable<typeof user> => Boolean(user)),
      createdBy: task.createdBy,
      assets: (task.assets ?? []).map((asset) => ({
        id: asset.id,
        fileName: asset.fileName,
        fileUrl: asset.fileUrl,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        caption: asset.caption,
        uploadedAt: asset.uploadedAt.toISOString(),
        uploadedBy: asset.uploadedBy,
      })),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private mapInternalReviewAction(action: InternalReviewAction) {
    switch (action) {
      case InternalReviewAction.PENDING:
        return InternalReviewStatus.PENDING;
      case InternalReviewAction.APPROVED:
        return InternalReviewStatus.APPROVED;
      case InternalReviewAction.REJECTED:
        return InternalReviewStatus.REJECTED;
      default:
        return InternalReviewStatus.NOT_REQUIRED;
    }
  }

  private resolvePostCopy(task: {
    postCaption?: string | null;
  }) {
    return task.postCaption?.trim() || "";
  }

  private async syncContentPostCopy(contentPostId: string, copy: string) {
    await this.prisma.contentPost.update({
      where: { id: contentPostId },
      data: { copy },
    });
  }

  private resolveTaskSchedule(dto: {
    dueDate?: string | null;
    publicationDate?: string | null;
    deliveryDate?: string | null;
  }) {
    const publicationDate = dto.publicationDate
      ? new Date(dto.publicationDate)
      : null;
    const deliveryDate = dto.deliveryDate
      ? new Date(dto.deliveryDate)
      : dto.dueDate
        ? new Date(dto.dueDate)
        : null;
    const dueDate = deliveryDate ?? (dto.dueDate ? new Date(dto.dueDate) : null);

    return { publicationDate, deliveryDate, dueDate };
  }

  private parseTaskRangeStart(value: string): Date {
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private parseTaskRangeEnd(value: string): Date {
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
      const endDate = new Date(value);
      endDate.setHours(23, 59, 59, 999);
      return endDate;
    }
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
}
