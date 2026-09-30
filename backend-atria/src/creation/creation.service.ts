import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ContentPostFormat,
  ContentPostStatus,
  ContentPlatform,
  ContractStatus,
  EventCategory,
  InternalReviewStatus,
  KanbanColumnType,
  KanbanTaskPriority,
  KanbanTaskStatus,
  ProductionPhase,
  Prisma,
} from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { CalendarService } from '../calendar/calendar.service';
import { ContentService } from '../content/content.service';
import { KanbanService } from '../kanban/kanban.service';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  statusToApi,
} from '../kanban/kanban-status';
import {
  resolveTaskDisplayColor,
  resolveTaskDisplayLabel,
} from '../kanban/production-phase';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBriefPlanDto,
  GenerateBriefPlanDto,
} from './dto/brief-to-content.dto';
import {
  CreateDeliverableDto,
  CreationDeliverableStatus,
  CreationDeliverableType,
} from './dto/deliverable.dto';
import {
  InternalReviewAction,
  InternalReviewDto,
} from '../kanban/dto/internal-review.dto';

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  LINKEDIN: '#0A66C2',
};

const postSelect = {
  id: true,
  title: true,
  platform: true,
  format: true,
  status: true,
  scheduledDate: true,
  updatedAt: true,
  metaPublishStatus: true,
  metaPublishError: true,
  metaScheduledAt: true,
  metaPublishedAt: true,
  client: {
    select: { id: true, companyName: true, avatarUrl: true },
  },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  attachments: {
    select: { id: true, name: true, url: true, mimeType: true },
    orderBy: { createdAt: 'asc' as const },
    take: 1,
  },
  _count: { select: { attachments: true, versions: true } },
} satisfies Prisma.ContentPostSelect;

const taskInclude = {
  column: { select: { id: true, title: true, type: true } },
  client: { select: { id: true, companyName: true, avatarUrl: true } },
  assignees: {
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
} satisfies Prisma.KanbanTaskInclude;

function getWeekBounds(reference = new Date()) {
  const start = new Date(reference);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function toLowerEnum<T extends string>(value: T) {
  return value.toLowerCase() as Lowercase<T>;
}

const DELIVERABLE_TYPE_LABELS: Record<CreationDeliverableType, string> = {
  [CreationDeliverableType.POST_INSTAGRAM]: 'Post Instagram',
  [CreationDeliverableType.POST_REELS]: 'Reels',
  [CreationDeliverableType.POST_CAROUSEL]: 'Carrossel',
  [CreationDeliverableType.POST_STATIC]: 'Post Estático',
  [CreationDeliverableType.POST_STORY]: 'Story',
  [CreationDeliverableType.MEETING]: 'Reunião',
  [CreationDeliverableType.DELIVERY]: 'Entrega',
};

const POST_TYPE_CONFIG: Record<
  | CreationDeliverableType.POST_INSTAGRAM
  | CreationDeliverableType.POST_REELS
  | CreationDeliverableType.POST_CAROUSEL
  | CreationDeliverableType.POST_STATIC
  | CreationDeliverableType.POST_STORY,
  { platform: ContentPlatform; format: ContentPostFormat }
> = {
  [CreationDeliverableType.POST_INSTAGRAM]: {
    platform: ContentPlatform.INSTAGRAM,
    format: ContentPostFormat.STATIC,
  },
  [CreationDeliverableType.POST_REELS]: {
    platform: ContentPlatform.INSTAGRAM,
    format: ContentPostFormat.REELS,
  },
  [CreationDeliverableType.POST_CAROUSEL]: {
    platform: ContentPlatform.INSTAGRAM,
    format: ContentPostFormat.CAROUSEL,
  },
  [CreationDeliverableType.POST_STATIC]: {
    platform: ContentPlatform.INSTAGRAM,
    format: ContentPostFormat.STATIC,
  },
  [CreationDeliverableType.POST_STORY]: {
    platform: ContentPlatform.INSTAGRAM,
    format: ContentPostFormat.STORY,
  },
};

@Injectable()
export class CreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly content: ContentService,
    private readonly kanban: KanbanService,
    private readonly calendar: CalendarService,
  ) {}

  async generateFromBrief(dto: GenerateBriefPlanDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      select: { id: true, companyName: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const plan = await this.ai.generateContentPlan({
      brief: dto.brief,
      clientName: client.companyName,
      platform: dto.platform,
      objective: dto.objective,
    });

    return {
      clientId: client.id,
      clientName: client.companyName,
      summary: plan.summary,
      platform: toLowerEnum(plan.platform),
      ideas: plan.ideas.map((idea) => ({
        title: idea.title,
        copy: idea.copy,
        format: toLowerEnum(idea.format),
        mediaConcept: idea.mediaConcept,
        suggestedDate: idea.suggestedDate,
      })),
      provider: plan.provider,
    };
  }

  async createFromBriefPlan(userId: string, dto: CreateBriefPlanDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const createTasks = dto.createKanbanTasks !== false;
    const todoColumnId = createTasks
      ? await this.resolveTodoColumnId()
      : null;

    const posts: Awaited<ReturnType<ContentService['createPost']>>[] = [];
    const tasks: Awaited<ReturnType<KanbanService['createTask']>>[] = [];

    for (const idea of dto.ideas) {
      const scheduledDate = new Date(idea.suggestedDate);
      const hasValidSchedule = !Number.isNaN(scheduledDate.getTime());

      const post = await this.content.createPost(userId, {
        title: idea.title,
        clientId: dto.clientId,
        platform: dto.platform,
        format: idea.format,
        copy: idea.copy,
        scheduledDate: hasValidSchedule ? idea.suggestedDate : undefined,
        status: hasValidSchedule
          ? ContentPostStatus.SCHEDULED
          : ContentPostStatus.DRAFT,
      });
      posts.push(post);

      if (createTasks && todoColumnId) {
        const task = await this.kanban.createTask(userId, {
          title: `Produção: ${idea.title}`,
          description: `Conceito de mídia:\n${idea.mediaConcept}\n\nCopy sugerida:\n${idea.copy}`,
          columnId: todoColumnId,
          clientId: dto.clientId,
          status: KanbanTaskStatus.FALTA_GRAVAR,
          priority: KanbanTaskPriority.MEDIUM,
          dueDate: hasValidSchedule ? idea.suggestedDate : undefined,
          contentPostId: post.id,
        });
        tasks.push(task);
      }
    }

    return {
      created: {
        posts: posts.length,
        tasks: tasks.length,
      },
      posts,
      tasks,
    };
  }

  private async resolveTodoColumnId() {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { statusKey: KanbanTaskStatus.FALTA_GRAVAR },
      orderBy: { order: 'asc' },
    });

    if (column) return column.id;

    await this.kanban.getColumns();
    const fallback = await this.prisma.kanbanColumn.findFirst({
      where: { statusKey: { not: null } },
      orderBy: { order: 'asc' },
    });

    if (!fallback) {
      throw new NotFoundException('No Kanban columns available');
    }

    return fallback.id;
  }

  async getClientPipeline(clientId: string, from?: string, to?: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true, avatarUrl: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const rangeStart = from ? new Date(from) : undefined;
    const rangeEnd = to ? new Date(to) : undefined;

    const posts = await this.prisma.contentPost.findMany({
      where: { clientId },
      include: {
        client: { select: { companyName: true } },
        kanbanTask: { select: { id: true, status: true, productionPhase: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        clientId,
        contentPostId: null,
      },
      include: { kanbanTask: { select: { id: true, status: true, productionPhase: true, internalReviewStatus: true } } },
      orderBy: { startAt: 'asc' },
    });

    const items = [
      ...posts
        .map((post) => this.mapPostToPipelineItem(post, client.companyName))
        .filter((item) => this.isInDateRange(item.scheduledAt, rangeStart, rangeEnd)),
      ...events
        .map((event) => this.mapEventToPipelineItem(event, client.companyName))
        .filter((item) => this.isInDateRange(item.scheduledAt, rangeStart, rangeEnd)),
    ].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

    return {
      client: {
        id: client.id,
        companyName: client.companyName,
        avatarUrl: client.avatarUrl,
      },
      items,
      groups: this.groupPipelineByDate(items),
    };
  }

  async updateItemStatus(
    source: 'post' | 'event',
    id: string,
    status: CreationDeliverableStatus,
  ) {
    if (source === 'post') {
      const existing = await this.prisma.contentPost.findUnique({
        where: { id },
        include: {
          client: { select: { companyName: true } },
          kanbanTask: { select: { id: true, status: true, productionPhase: true } },
        },
      });

      if (!existing) {
        throw new NotFoundException('Post not found');
      }

      if (
        status === CreationDeliverableStatus.PENDING &&
        existing.internalReviewStatus !== InternalReviewStatus.APPROVED
      ) {
        throw new BadRequestException(
          'Aprovação interna necessária antes de enviar ao cliente',
        );
      }

      const post = await this.prisma.contentPost.update({
        where: { id },
        data: { status: this.mapDeliverableStatusToPostStatus(status) },
        include: {
          client: { select: { companyName: true } },
          kanbanTask: { select: { id: true, status: true, productionPhase: true } },
        },
      });

      await this.calendar.syncEventFromPost(post, post.userId);

      return {
        item: this.mapPostToPipelineItem(post, post.client.companyName),
      };
    }

    const existing = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: { client: { select: { companyName: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    const baseTitle = existing.title.replace(/ \(Rascunho\)$/, '');
    const title =
      status === CreationDeliverableStatus.DRAFT
        ? `${baseTitle} (Rascunho)`
        : baseTitle;

    const event = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        isPending: status === CreationDeliverableStatus.PENDING,
      },
    });

    return {
      item: this.mapEventToPipelineItem(
        event,
        existing.client?.companyName ?? '',
      ),
    };
  }

  async createDeliverable(userId: string, dto: CreateDeliverableDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      select: { id: true, companyName: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    const isPostType = this.isPostDeliverableType(dto.type);

    if (isPostType) {
      const config = POST_TYPE_CONFIG[dto.type as keyof typeof POST_TYPE_CONFIG];
      const post = await this.content.createPost(userId, {
        title: dto.title,
        clientId: dto.clientId,
        platform: config.platform,
        format: config.format,
        copy: dto.title,
        scheduledDate: dto.scheduledAt,
        status: this.mapDeliverableStatusToPostStatus(dto.status),
        referenceUrl: dto.referenceUrl,
      });

      const todoColumnId = await this.resolveTodoColumnId();
      await this.kanban.createTask(userId, {
        title: dto.title,
        description: `Produção: ${DELIVERABLE_TYPE_LABELS[dto.type]}`,
        columnId: todoColumnId,
        clientId: dto.clientId,
        status: KanbanTaskStatus.FALTA_GRAVAR,
        dueDate: dto.scheduledAt,
        priority: KanbanTaskPriority.MEDIUM,
        referenceUrl: dto.referenceUrl,
        contentPostId: post.id,
      });

      const linkedPost = await this.prisma.contentPost.findUniqueOrThrow({
        where: { id: post.id },
        include: {
          client: { select: { companyName: true } },
          kanbanTask: { select: { id: true, status: true, productionPhase: true } },
        },
      });

      return {
        source: 'post' as const,
        item: this.mapPostToPipelineItem(linkedPost, client.companyName),
      };
    }

    const startAt = scheduledAt;
    const endAt = new Date(startAt);
    endAt.setHours(endAt.getHours() + 1);

    const event = await this.calendar.createEvent(userId, {
      title:
        dto.status === CreationDeliverableStatus.DRAFT
          ? `${dto.title} (Rascunho)`
          : dto.title,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      category:
        dto.type === CreationDeliverableType.DELIVERY
          ? EventCategory.DEADLINE
          : EventCategory.MEETING,
      clientId: dto.clientId,
      referenceUrl: dto.referenceUrl,
      isPending: dto.status === CreationDeliverableStatus.PENDING,
      createKanbanTask: false,
    });

    const todoColumnId = await this.resolveTodoColumnId();
    await this.kanban.createTask(userId, {
      title: dto.title,
      description: `Compromisso: ${DELIVERABLE_TYPE_LABELS[dto.type]}`,
      columnId: todoColumnId,
      clientId: dto.clientId,
      status: KanbanTaskStatus.FALTA_GRAVAR,
      dueDate: dto.scheduledAt,
      publicationDate: dto.scheduledAt,
      priority: KanbanTaskPriority.MEDIUM,
      referenceUrl: dto.referenceUrl,
      calendarEventId: event.id,
    });

    const fullEvent = await this.prisma.calendarEvent.findUniqueOrThrow({
      where: { id: event.id },
      include: { kanbanTask: { select: { id: true, status: true, productionPhase: true } } },
    });

    return {
      source: 'event' as const,
      item: this.mapEventToPipelineItem(fullEvent, client.companyName),
    };
  }

  async updatePipelineInternalReview(
    userId: string,
    role: string,
    source: 'post' | 'event',
    id: string,
    dto: InternalReviewDto,
  ) {
    if (source === 'post') {
      const post = await this.prisma.contentPost.findUniqueOrThrow({
        where: { id },
        include: {
          client: { select: { companyName: true } },
          kanbanTask: { select: { id: true, status: true, productionPhase: true } },
        },
      });

      if (post.kanbanTask?.id) {
        await this.kanban.updateInternalReview(userId, role, post.kanbanTask.id, dto);
      } else {
        await this.content.updateInternalReview(id, userId, role, dto);
      }

      const refreshed = await this.prisma.contentPost.findUniqueOrThrow({
        where: { id },
        include: {
          client: { select: { companyName: true } },
          kanbanTask: { select: { id: true, status: true, productionPhase: true } },
        },
      });

      return {
        item: this.mapPostToPipelineItem(
          refreshed,
          refreshed.client.companyName,
        ),
      };
    }

    const task = await this.prisma.kanbanTask.findFirst({
      where: { calendarEventId: id },
      select: { id: true },
    });

    if (task) {
      await this.kanban.updateInternalReview(userId, role, task.id, dto);
    }

    const event = await this.prisma.calendarEvent.findUniqueOrThrow({
      where: { id },
      include: {
        kanbanTask: { select: { id: true, status: true, productionPhase: true, internalReviewStatus: true } },
      },
    });

    return {
      item: this.mapEventToPipelineItem(
        event,
        (
          await this.prisma.client.findUnique({
            where: { id: event.clientId ?? '' },
            select: { companyName: true },
          })
        )?.companyName ?? '',
      ),
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

  private isPostDeliverableType(type: CreationDeliverableType) {
    return type !== CreationDeliverableType.MEETING &&
      type !== CreationDeliverableType.DELIVERY;
  }

  private mapDeliverableStatusToPostStatus(
    status: CreationDeliverableStatus,
  ): ContentPostStatus {
    switch (status) {
      case CreationDeliverableStatus.PENDING:
        return ContentPostStatus.PENDING_APPROVAL;
      case CreationDeliverableStatus.APPROVED:
        return ContentPostStatus.SCHEDULED;
      default:
        return ContentPostStatus.DRAFT;
    }
  }

  private mapPostStatusToPipeline(
    status: ContentPostStatus,
  ): 'draft' | 'pending' | 'approved' {
    if (status === ContentPostStatus.DRAFT) return 'draft';
    if (
      status === ContentPostStatus.PENDING_APPROVAL ||
      status === ContentPostStatus.REJECTED
    ) {
      return 'pending';
    }
    return 'approved';
  }

  private mapPostStatusLabel(status: ContentPostStatus) {
    const pipeline = this.mapPostStatusToPipeline(status);
    if (pipeline === 'draft') return 'Rascunho';
    if (pipeline === 'pending') return 'Pendente';
    return 'Aprovado';
  }

  private mapPostTypeLabel(platform: ContentPlatform, format: ContentPostFormat) {
    if (format === ContentPostFormat.REELS) return 'Reels';
    if (format === ContentPostFormat.CAROUSEL) return 'Carrossel';
    if (format === ContentPostFormat.STORY) return 'Story';
    if (platform === ContentPlatform.INSTAGRAM) return 'Post Instagram';
    return `${platform} ${format}`;
  }

  private mapPostToPipelineItem(
    post: Prisma.ContentPostGetPayload<{
      include: {
        client: { select: { companyName: true } };
        kanbanTask: { select: { id: true; status: true; productionPhase: true } };
      };
    }>,
    clientName: string,
  ) {
    const status = this.mapPostStatusToPipeline(post.status);
    const scheduledAt =
      post.scheduledDate?.toISOString() ?? post.createdAt.toISOString();
    const taskStatus = post.kanbanTask?.status
      ? statusToApi(post.kanbanTask.status)
      : null;

    return {
      id: post.id,
      source: 'post' as const,
      postId: post.id,
      eventId: null as string | null,
      title: post.title,
      type: this.mapPostTypeLabel(post.platform, post.format),
      typeKey: `post_${post.format.toLowerCase()}`,
      scheduledAt,
      status,
      statusLabel: this.mapPostStatusLabel(post.status),
      referenceUrl: post.referenceUrl,
      clientId: post.clientId,
      clientName,
      href: `/content/${post.id}`,
      kanbanTaskId: post.kanbanTask?.id ?? null,
      taskStatus,
      taskStatusColor: post.kanbanTask?.status
        ? resolveTaskDisplayColor(
            post.kanbanTask.status,
            post.kanbanTask.productionPhase,
            STATUS_COLORS,
          )
        : null,
      taskStatusLabel: post.kanbanTask?.status
        ? resolveTaskDisplayLabel(
            post.kanbanTask.status,
            post.kanbanTask.productionPhase,
            STATUS_LABELS,
          )
        : null,
      internalReviewStatus: post.internalReviewStatus.toLowerCase(),
    };
  }

  private mapEventToPipelineItem(
    event: {
      id: string;
      title: string;
      startAt: Date;
      category: EventCategory;
      referenceUrl: string | null;
      clientId: string | null;
      isPending: boolean;
      kanbanTask?: {
        id: string;
        status?: KanbanTaskStatus;
        productionPhase?: ProductionPhase | null;
        internalReviewStatus?: InternalReviewStatus;
      } | null;
    },
    clientName: string,
  ) {
    const isDraft = event.title.endsWith(' (Rascunho)');
    const status: 'draft' | 'pending' | 'approved' = event.isPending
      ? 'pending'
      : isDraft
        ? 'draft'
        : 'approved';

    const typeLabel =
      event.category === EventCategory.DEADLINE
        ? 'Entrega'
        : event.category === EventCategory.MEETING
          ? 'Reunião'
          : event.category === EventCategory.PUBLISH
            ? 'Publicação'
            : 'Compromisso';

    const taskStatus = event.kanbanTask?.status
      ? statusToApi(event.kanbanTask.status)
      : null;

    return {
      id: event.id,
      source: 'event' as const,
      postId: null as string | null,
      eventId: event.id,
      title: isDraft ? event.title.replace(/ \(Rascunho\)$/, '') : event.title,
      type: typeLabel,
      typeKey: event.category.toLowerCase(),
      scheduledAt: event.startAt.toISOString(),
      status,
      statusLabel:
        status === 'draft'
          ? 'Rascunho'
          : status === 'pending'
            ? 'Pendente'
            : 'Aprovado',
      referenceUrl: event.referenceUrl,
      clientId: event.clientId ?? '',
      clientName,
      href: '/calendar',
      kanbanTaskId: event.kanbanTask?.id ?? null,
      taskStatus,
      taskStatusColor: event.kanbanTask?.status
        ? resolveTaskDisplayColor(
            event.kanbanTask.status,
            event.kanbanTask.productionPhase,
            STATUS_COLORS,
          )
        : null,
      taskStatusLabel: event.kanbanTask?.status
        ? resolveTaskDisplayLabel(
            event.kanbanTask.status,
            event.kanbanTask.productionPhase,
            STATUS_LABELS,
          )
        : null,
      internalReviewStatus:
        event.kanbanTask?.internalReviewStatus?.toLowerCase() ??
        'not_required',
    };
  }

  private isInDateRange(
    scheduledAt: string,
    from?: Date,
    to?: Date,
  ) {
    if (!from && !to) return true;
    const date = new Date(scheduledAt);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }

  private groupPipelineByDate(
    items: Array<
      ReturnType<typeof this.mapPostToPipelineItem> |
        ReturnType<typeof this.mapEventToPipelineItem>
    >,
  ) {
    const groups = new Map<string, typeof items>();

    for (const item of items) {
      const key = item.scheduledAt.split('T')[0];
      const bucket = groups.get(key) ?? [];
      bucket.push(item);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, groupItems]) => ({
        date,
        dateLabel: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        items: groupItems,
      }));
  }

  async getCommandCenter() {
    const { start: weekStart, end: weekEnd } = getWeekBounds();
    const now = new Date();
    const scheduleHorizon = new Date(now);
    scheduleHorizon.setDate(scheduleHorizon.getDate() + 21);

    const doneColumn = await this.prisma.kanbanColumn.findFirst({
      where: { statusKey: KanbanTaskStatus.OK },
      select: { id: true },
    });
    const notDoneFilter = doneColumn
      ? { columnId: { not: doneColumn.id } }
      : {};

    const weekPostWhere: Prisma.ContentPostWhereInput = {
      status: {
        in: [
          ContentPostStatus.DRAFT,
          ContentPostStatus.PENDING_APPROVAL,
          ContentPostStatus.APPROVED,
        ],
      },
      OR: [
        { scheduledDate: { gte: weekStart, lte: weekEnd } },
        { updatedAt: { gte: weekStart, lte: weekEnd } },
      ],
    };

    const weekTaskWhere: Prisma.KanbanTaskWhereInput = {
      ...notDoneFilter,
      OR: [
        { dueDate: { gte: weekStart, lte: weekEnd } },
        { updatedAt: { gte: weekStart, lte: weekEnd } },
      ],
    };

    const [
      weekPosts,
      weekTasks,
      approvalPosts,
      scheduledPosts,
      publishEvents,
      overdueTasks,
      postsMissingAssets,
      unsignedContracts,
    ] = await Promise.all([
      this.prisma.contentPost.findMany({
        where: weekPostWhere,
        select: postSelect,
        orderBy: [{ clientId: 'asc' }, { scheduledDate: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.kanbanTask.findMany({
        where: weekTaskWhere,
        include: taskInclude,
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.contentPost.findMany({
        where: {
          status: {
            in: [
              ContentPostStatus.PENDING_APPROVAL,
              ContentPostStatus.REJECTED,
            ],
          },
        },
        select: postSelect,
        orderBy: { updatedAt: 'asc' },
        take: 20,
      }),
      this.prisma.contentPost.findMany({
        where: {
          scheduledDate: { gte: now, lte: scheduleHorizon },
          status: {
            in: [
              ContentPostStatus.SCHEDULED,
              ContentPostStatus.APPROVED,
              ContentPostStatus.PENDING_APPROVAL,
            ],
          },
        },
        select: postSelect,
        orderBy: { scheduledDate: 'asc' },
        take: 30,
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          category: EventCategory.PUBLISH,
          startAt: { gte: now, lte: scheduleHorizon },
        },
        include: {
          client: { select: { id: true, companyName: true, avatarUrl: true } },
        },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),
      this.prisma.kanbanTask.findMany({
        where: {
          ...notDoneFilter,
          dueDate: { lt: now },
        },
        include: taskInclude,
        orderBy: { dueDate: 'asc' },
        take: 15,
      }),
      this.prisma.contentPost.findMany({
        where: {
          status: {
            in: [
              ContentPostStatus.DRAFT,
              ContentPostStatus.PENDING_APPROVAL,
            ],
          },
          attachments: { none: {} },
        },
        select: postSelect,
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
      this.prisma.contract.findMany({
        where: {
          status: { in: [ContractStatus.DRAFT, ContractStatus.SENT] },
        },
        include: {
          client: { select: { id: true, companyName: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
    ]);

    const deliverableItems = [
      ...weekPosts.map((post) => this.toPostDeliverable(post)),
      ...weekTasks.map((task) => this.toTaskDeliverable(task)),
    ];

    const byClientMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        avatarUrl: string | null;
        items: ReturnType<typeof this.toPostDeliverable>[];
      }
    >();

    for (const item of deliverableItems) {
      const key = item.clientId ?? 'unassigned';
      const existing = byClientMap.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        byClientMap.set(key, {
          clientId: item.clientId ?? 'unassigned',
          clientName: item.clientName,
          avatarUrl: item.clientAvatarUrl,
          items: [item],
        });
      }
    }

    const byFormat: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const item of deliverableItems) {
      if (item.format) {
        byFormat[item.format] = (byFormat[item.format] ?? 0) + 1;
      }
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }

    const scheduleItems = [
      ...scheduledPosts.map((post) => ({
        id: post.id,
        type: 'post' as const,
        title: post.title,
        clientId: post.client.id,
        clientName: post.client.companyName,
        platform: toLowerEnum(post.platform),
        format: toLowerEnum(post.format),
        status: toLowerEnum(post.status),
        scheduledAt: post.scheduledDate!.toISOString(),
        color: PLATFORM_COLORS[post.platform] ?? '#004949',
        metaPublishStatus: toLowerEnum(post.metaPublishStatus),
        metaPublishError: post.metaPublishError,
        metaScheduledAt: post.metaScheduledAt?.toISOString() ?? null,
        metaPublishedAt: post.metaPublishedAt?.toISOString() ?? null,
      })),
      ...publishEvents.map((event) => ({
        id: event.id,
        type: 'event' as const,
        title: event.title,
        clientId: event.client?.id ?? null,
        clientName: event.client?.companyName ?? 'Sem cliente',
        platform: null,
        format: null,
        status: event.isPending ? 'pending' : 'confirmed',
        scheduledAt: event.startAt.toISOString(),
        color: event.color ?? '#004949',
        referenceUrl: event.referenceUrl,
      })),
    ].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

    const blockers = [
      ...overdueTasks.map((task) => ({
        id: `overdue-task-${task.id}`,
        severity: 'red' as const,
        type: 'overdue_task' as const,
        title: task.title,
        description: `Tarefa atrasada · ${task.column.title}`,
        clientId: task.client?.id ?? null,
        clientName: task.client?.companyName ?? 'Sem cliente',
        dueDate: task.dueDate?.toISOString() ?? null,
        href: '/kanban',
      })),
      ...postsMissingAssets.map((post) => ({
        id: `missing-assets-${post.id}`,
        severity: 'amber' as const,
        type: 'missing_assets' as const,
        title: post.title,
        description: 'Post sem mídia ou anexos',
        clientId: post.client.id,
        clientName: post.client.companyName,
        dueDate: post.scheduledDate?.toISOString() ?? null,
        href: `/content/${post.id}`,
      })),
      ...unsignedContracts.map((contract) => ({
        id: `unsigned-contract-${contract.id}`,
        severity: 'red' as const,
        type: 'unsigned_contract' as const,
        title: contract.title,
        description: `Contrato ${toLowerEnum(contract.status)} · ${contract.client.companyName}`,
        clientId: contract.client.id,
        clientName: contract.client.companyName,
        dueDate: contract.startDate.toISOString(),
        href: '/contracts',
      })),
    ];

    return {
      weekRange: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      deliverables: {
        groups: Array.from(byClientMap.values()).sort((a, b) =>
          a.clientName.localeCompare(b.clientName, 'pt-BR'),
        ),
        summary: {
          total: deliverableItems.length,
          byFormat,
          byStatus,
        },
      },
      approvalsQueue: approvalPosts.map((post) => ({
        id: post.id,
        title: post.title,
        clientId: post.client.id,
        clientName: post.client.companyName,
        clientAvatarUrl: post.client.avatarUrl,
        platform: toLowerEnum(post.platform),
        format: toLowerEnum(post.format),
        status: toLowerEnum(post.status),
        assignee: post.assignee,
        updatedAt: post.updatedAt.toISOString(),
        scheduledDate: post.scheduledDate?.toISOString() ?? null,
        previewAttachment: post.attachments[0]
          ? {
              id: post.attachments[0].id,
              name: post.attachments[0].name,
              url: post.attachments[0].url,
              mimeType: post.attachments[0].mimeType,
            }
          : null,
      })),
      publishingSchedule: scheduleItems,
      blockers,
      stats: {
        deliverablesThisWeek: deliverableItems.length,
        pendingApprovals: approvalPosts.filter(
          (p) => p.status === ContentPostStatus.PENDING_APPROVAL,
        ).length,
        scheduledReleases: scheduleItems.length,
        activeBlockers: blockers.length,
      },
    };
  }

  private toPostDeliverable(
    post: Prisma.ContentPostGetPayload<{ select: typeof postSelect }>,
  ) {
    return {
      id: post.id,
      type: 'post' as const,
      title: post.title,
      clientId: post.client.id,
      clientName: post.client.companyName,
      clientAvatarUrl: post.client.avatarUrl,
      format: toLowerEnum(post.format),
      status: toLowerEnum(post.status),
      platform: toLowerEnum(post.platform),
      scheduledDate: post.scheduledDate?.toISOString() ?? null,
      dueDate: post.scheduledDate?.toISOString() ?? null,
      assignee: post.assignee,
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private toTaskDeliverable(
    task: Prisma.KanbanTaskGetPayload<{ include: typeof taskInclude }>,
  ) {
    return {
      id: task.id,
      type: 'task' as const,
      title: task.title,
      clientId: task.client?.id ?? null,
      clientName: task.client?.companyName ?? 'Sem cliente',
      clientAvatarUrl: task.client?.avatarUrl ?? null,
      format: null,
      status: task.column.type
        ? toLowerEnum(task.column.type)
        : 'in_progress',
      platform: null,
      scheduledDate: null,
      dueDate: task.dueDate?.toISOString() ?? null,
      columnTitle: task.column.title,
      priority: toLowerEnum(task.priority),
      assignees: task.assignees.map((a) => a.user),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
