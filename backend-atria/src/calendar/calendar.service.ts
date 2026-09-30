import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ContentPost, EventCategory, KanbanTaskStatus, Prisma, UserCategory } from '@prisma/client';
import { assertCalendarEventEditAccess } from '../auth/utils/rbac';
import { PrismaService } from '../prisma/prisma.service';
import { KanbanService } from '../kanban/kanban.service';
import { DEFAULT_TASK_STATUS } from '../kanban/kanban-defaults';
import {
  KANBAN_STATUS_DEFINITIONS,
  STATUS_COLORS,
  statusToApi,
} from '../kanban/kanban-status';
import { resolveTaskDisplayColor, phaseToApi } from '../kanban/production-phase';
import {
  toUnifiedTaskCore,
  type UnifiedTaskCore,
} from '../kanban/kanban-task.mapper';
import {
  buildCalendarGridWhere,
  buildUnmappedCalendarTasksWhere,
} from './calendar-event-query';
import {
  CreateEventDto,
  QueryEventsDto,
  UpdateEventDto,
} from './dto/event.dto';

const CATEGORY_COLORS: Record<string, string> = {
  MEETING: '#004949',
  DEADLINE: '#E8C39E',
  PUBLISH: '#006666',
  OTHER: '#8B7355',
};

const MEMBER_COLORS = [
  '#004949',
  '#E8C39E',
  '#006666',
  '#2D6A6A',
  '#8B7355',
  '#C4A882',
];

const CLIENT_COLORS = [
  '#8B5CF6',
  '#06B6D4',
  '#3B82F6',
  '#F97316',
  '#EC4899',
  '#10B981',
  '#F59E0B',
  '#6366F1',
  '#14B8A6',
  '#EF4444',
];

const eventInclude = {
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  assignedGroup: {
    select: {
      id: true,
      name: true,
      color: true,
      members: { select: { userId: true } },
      users: { select: { id: true } },
    },
  },
  client: {
    select: {
      id: true,
      companyName: true,
      avatarUrl: true,
    },
  },
  kanbanTask: {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      productionPhase: true,
      contentType: true,
      dueDate: true,
      publicationDate: true,
      deliveryDate: true,
      clientId: true,
      companyId: true,
      createdAt: true,
      deletedAt: true,
      client: {
        select: {
          id: true,
          companyName: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.CalendarEventInclude;

type EventWithRelations = Prisma.CalendarEventGetPayload<{
  include: typeof eventInclude;
}>;

type CalendarEventResponse = ReturnType<CalendarService['toEventResponse']>;

export type CalendarEventsResult =
  | CalendarEventResponse[]
  | { events: CalendarEventResponse[]; unmapped: UnifiedTaskCore[] };

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => KanbanService))
    private readonly kanbanService: KanbanService,
  ) {}

  async getTeamMembers() {
    const users = await this.prisma.user.findMany({
      where: {
        category: UserCategory.MEMBER,
        isActive: true,
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });

    return users.map((user, index) => ({
      ...user,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    }));
  }

  async getEvents(
    query: QueryEventsDto & { includeUnmapped: true },
  ): Promise<{ events: CalendarEventResponse[]; unmapped: UnifiedTaskCore[] }>;
  async getEvents(query: QueryEventsDto): Promise<CalendarEventResponse[]>;
  async getEvents(query: QueryEventsDto): Promise<CalendarEventsResult> {
    const events = await this.prisma.calendarEvent.findMany({
      where: buildCalendarGridWhere({
        from: query.from,
        to: query.to,
        clientId: query.clientId,
      }),
      include: eventInclude,
    });

    const mapped = events
      .filter((event) => !event.kanbanTask?.deletedAt)
      .map((event) => this.toEventResponse(event))
      .sort(
        (left, right) =>
          new Date(left.publicationDate).getTime() -
          new Date(right.publicationDate).getTime(),
      );

    if (!query.includeUnmapped) {
      return mapped;
    }

    const unmappedTasks = await this.prisma.kanbanTask.findMany({
      where: buildUnmappedCalendarTasksWhere({ clientId: query.clientId }),
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        productionPhase: true,
        contentType: true,
        dueDate: true,
        publicationDate: true,
        deliveryDate: true,
        clientId: true,
        companyId: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            companyName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      events: mapped,
      unmapped: unmappedTasks.map((task) => toUnifiedTaskCore(task)),
    };
  }

  async createEvent(userId: string, dto: CreateEventDto) {
    if (dto.clientId) {
      await this.ensureClientExists(dto.clientId);
    }
    if (dto.assignedGroupId) {
      await this.ensureGroupExists(dto.assignedGroupId);
    }

    const status = DEFAULT_TASK_STATUS;
    const color = dto.color ?? STATUS_COLORS[status];

    const event = await this.prisma.calendarEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        category: dto.category,
        color,
        referenceUrl: dto.referenceUrl,
        isPending: dto.isPending ?? false,
        assigneeId: dto.assigneeId,
        assignedGroupId: dto.assignedGroupId,
        clientId: dto.clientId,
        createdById: userId,
      },
      include: eventInclude,
    });

    if (dto.createKanbanTask !== false) {
      await this.kanbanService.getColumns();

      const column = await this.prisma.kanbanColumn.findFirst({
        where: { statusKey: status },
        orderBy: { order: 'asc' },
      });

      if (column) {
        await this.kanbanService.createTask(userId, {
          title: dto.title,
          description: dto.description,
          columnId: column.id,
          status,
          clientId: dto.clientId,
          dueDate: dto.endAt,
          publicationDate: dto.startAt,
          deliveryDate: dto.endAt,
          assigneeIds: dto.assigneeId ? [dto.assigneeId] : undefined,
          assignedGroupId: dto.assignedGroupId,
          referenceUrl: dto.referenceUrl,
          calendarEventId: event.id,
        });
      }
    }

    const refreshed = await this.prisma.calendarEvent.findUnique({
      where: { id: event.id },
      include: eventInclude,
    });

    return this.toEventResponse(refreshed ?? event);
  }

  async updateEvent(id: string, userId: string, role: string, dto: UpdateEventDto) {
    const existing = await this.ensureEventExists(id);
    assertCalendarEventEditAccess(role, userId, existing);

    if (dto.clientId) {
      await this.ensureClientExists(dto.clientId);
    }
    if (dto.assignedGroupId) {
      await this.ensureGroupExists(dto.assignedGroupId);
    }

    const { status, ...rest } = dto;

    const linkedTask = await this.prisma.kanbanTask.findFirst({
      where: { calendarEventId: id },
      select: { id: true },
    });

    if (status && linkedTask) {
      await this.kanbanService.updateTask(userId, role, linkedTask.id, {
        status,
      });
    }

    if (linkedTask && (rest.startAt || rest.endAt)) {
      await this.prisma.kanbanTask.update({
        where: { id: linkedTask.id },
        data: {
          ...(rest.startAt
            ? { publicationDate: new Date(rest.startAt) }
            : {}),
          ...(rest.endAt
            ? {
                deliveryDate: new Date(rest.endAt),
                dueDate: new Date(rest.endAt),
              }
            : {}),
        },
      });
    }

    const eventData: Prisma.CalendarEventUncheckedUpdateInput = {
      title: rest.title,
      description: rest.description,
      startAt: rest.startAt ? new Date(rest.startAt) : undefined,
      endAt: rest.endAt ? new Date(rest.endAt) : undefined,
      category: rest.category,
      color: status ? STATUS_COLORS[status] : rest.color,
      isPending: rest.isPending,
      assigneeId: rest.assigneeId === null ? null : rest.assigneeId,
      assignedGroupId:
        rest.assignedGroupId === null ? null : rest.assignedGroupId,
      clientId: rest.clientId === null ? null : rest.clientId,
      referenceUrl:
        rest.referenceUrl === null || rest.referenceUrl === ''
          ? null
          : rest.referenceUrl,
    };

    const hasEventUpdates =
      status !== undefined ||
      Object.values(rest).some((value) => value !== undefined);

    if (hasEventUpdates) {
      await this.prisma.calendarEvent.update({
        where: { id },
        data: eventData,
      });
    }

    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: eventInclude,
    });

    if (!event) throw new NotFoundException('Event not found');

    return this.toEventResponse(event);
  }

  async deleteEvent(id: string, userId: string, role: string) {
    const existing = await this.ensureEventExists(id);
    assertCalendarEventEditAccess(role, userId, existing);
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  async syncEventFromPost(post: ContentPost, userId: string) {
    if (!post.scheduledDate) {
      await this.prisma.calendarEvent.deleteMany({
        where: { contentPostId: post.id },
      });
      return null;
    }

    const startAt = new Date(post.scheduledDate);
    const endAt = new Date(startAt);
    endAt.setHours(endAt.getHours() + 1);

    const existing = await this.prisma.calendarEvent.findFirst({
      where: { contentPostId: post.id },
    });

    const data = {
      title: post.title,
      startAt,
      endAt,
      category: EventCategory.PUBLISH,
      clientId: post.clientId,
      referenceUrl: post.referenceUrl,
      isPending: false,
      color: STATUS_COLORS[DEFAULT_TASK_STATUS],
    };

    if (existing) {
      const event = await this.prisma.calendarEvent.update({
        where: { id: existing.id },
        data,
        include: eventInclude,
      });
      return this.toEventResponse(event);
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        ...data,
        contentPostId: post.id,
        createdById: userId,
      },
      include: eventInclude,
    });

    return this.toEventResponse(event);
  }

  private async ensureEventExists(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        assignedGroup: {
          select: {
            members: { select: { userId: true } },
            users: { select: { id: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async ensureGroupExists(id: string) {
    const group = await this.prisma.userGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  private async ensureClientExists(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private getClientColor(clientId: string) {
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
  }

  private toEventResponse(event: EventWithRelations) {
    const clientColor = event.client
      ? this.getClientColor(event.client.id)
      : null;

    const taskStatus = event.kanbanTask?.status
      ? statusToApi(event.kanbanTask.status)
      : this.resolveStatusFromColor(event.color);
    const productionPhase = event.kanbanTask?.productionPhase
      ? phaseToApi(event.kanbanTask.productionPhase)
      : null;
    const taskStatusColor = taskStatus
      ? resolveTaskDisplayColor(
          event.kanbanTask?.status ??
            KANBAN_STATUS_DEFINITIONS.find(
              (def) => statusToApi(def.status) === taskStatus,
            )!.status,
          event.kanbanTask?.productionPhase,
          STATUS_COLORS,
        )
      : null;

    const publicationDate = event.kanbanTask?.publicationDate ?? event.startAt;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      publicationDate: publicationDate.toISOString(),
      startAt: publicationDate.toISOString(),
      endAt: event.endAt.toISOString(),
      category: event.category.toLowerCase(),
      color:
        taskStatusColor ??
        clientColor ??
        event.color ??
        CATEGORY_COLORS[event.category] ??
        '#004949',
      referenceUrl: event.referenceUrl,
      isPending: event.isPending,
      kanbanTaskId: event.kanbanTask?.id ?? null,
      taskStatus,
      productionPhase,
      taskStatusColor,
      task: event.kanbanTask ? toUnifiedTaskCore(event.kanbanTask) : null,
      clientId: event.clientId,
      client: event.client
        ? {
            id: event.client.id,
            name: event.client.companyName,
            companyName: event.client.companyName,
            avatarUrl: event.client.avatarUrl,
            color: clientColor!,
          }
        : null,
      createdBy: event.createdBy,
      assignee: event.assignee,
      assignedGroupId: event.assignedGroupId,
      assignedGroup: event.assignedGroup
        ? {
            id: event.assignedGroup.id,
            name: event.assignedGroup.name,
            color: event.assignedGroup.color,
          }
        : null,
    };
  }

  private resolveStatusFromColor(color: string | null | undefined) {
    if (!color) return null;
    const normalized = color.toLowerCase();
    const match = KANBAN_STATUS_DEFINITIONS.find(
      (def) => def.color.toLowerCase() === normalized,
    );
    return match ? statusToApi(match.status) : null;
  }
}
