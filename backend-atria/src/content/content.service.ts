import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ContentPostStatus,
  InternalReviewStatus,
  PostFeedbackType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { KanbanService } from '../kanban/kanban.service';
import { MetaInsightsService } from '../meta-insights/meta-insights.service';
import { CalendarService } from '../calendar/calendar.service';
import { isClientFacingRole } from '../auth/constants/permissions';
import { assertCanPerformInternalApproval } from '../auth/utils/rbac';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContentPostDto,
  QueryContentPostsDto,
  UpdateContentPostDto,
} from './dto/content-post.dto';
import {
  CreatePostVersionDto,
  RejectContentPostDto,
} from './dto/content-workflow.dto';
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

const userSelect = { id: true, name: true, avatarUrl: true } as const;

const clientSelect = {
  id: true,
  companyName: true,
  avatarUrl: true,
  instagram: true,
} as const;

const postInclude = {
  attachments: true,
  user: { select: userSelect },
  assignee: { select: userSelect },
  client: { select: clientSelect },
} satisfies Prisma.ContentPostInclude;

type PostWithRelations = Prisma.ContentPostGetPayload<{
  include: typeof postInclude;
}>;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly integrations: IntegrationsService,
    private readonly metaInsights: MetaInsightsService,
    private readonly calendar: CalendarService,
    private readonly kanbanService: KanbanService,
  ) {}

  async getManagementBoard(clientId?: string, status?: ContentPostStatus) {
    const where: Prisma.ContentPostWhereInput = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const feedbackInclude = {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      include: {
        user: { select: userSelect },
        version: { select: { id: true, versionNumber: true } },
      },
    };

    const [overview, posts] = await Promise.all([
      this.getOverview(clientId),
      this.prisma.contentPost.findMany({
        where,
        include: {
          ...postInclude,
          feedback: feedbackInclude,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      overview,
      posts: posts.map((post) => ({
        ...this.toPostResponse(post),
        latestFeedback: post.feedback[0]
          ? this.toFeedbackResponse(post.feedback[0])
          : null,
      })),
    };
  }

  async getOverview(clientId?: string) {
    const where: Prisma.ContentPostWhereInput = clientId ? { clientId } : {};

    const [drafts, pendingApproval, scheduled, published, total] =
      await Promise.all([
        this.prisma.contentPost.count({
          where: { ...where, status: ContentPostStatus.DRAFT },
        }),
        this.prisma.contentPost.count({
          where: { ...where, status: ContentPostStatus.PENDING_APPROVAL },
        }),
        this.prisma.contentPost.count({
          where: { ...where, status: ContentPostStatus.SCHEDULED },
        }),
        this.prisma.contentPost.count({
          where: { ...where, status: ContentPostStatus.PUBLISHED },
        }),
        this.prisma.contentPost.count({ where }),
      ]);

    return { drafts, pendingApproval, scheduled, published, total };
  }

  async getCalendarOverview(from?: string, to?: string, clientId?: string) {
    const where: Prisma.ContentPostWhereInput = {
      scheduledDate: { not: null },
      status: {
        in: [
          ContentPostStatus.SCHEDULED,
          ContentPostStatus.PUBLISHED,
          ContentPostStatus.PENDING_APPROVAL,
        ],
      },
    };

    if (clientId) where.clientId = clientId;

    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = new Date(from);
      if (to) where.scheduledDate.lte = new Date(to);
    }

    const posts = await this.prisma.contentPost.findMany({
      where,
      select: {
        id: true,
        title: true,
        platform: true,
        scheduledDate: true,
        status: true,
        client: { select: { companyName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      platform: post.platform.toLowerCase(),
      scheduledDate: post.scheduledDate!.toISOString(),
      status: post.status.toLowerCase(),
      clientName: post.client.companyName,
      color: PLATFORM_COLORS[post.platform] ?? '#004949',
    }));
  }

  async getPosts(query: QueryContentPostsDto) {
    const where: Prisma.ContentPostWhereInput = {};

    if (query.clientId) where.clientId = query.clientId;
    if (query.platform) where.platform = query.platform;
    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      where.scheduledDate = {};
      if (query.from) where.scheduledDate.gte = new Date(query.from);
      if (query.to) where.scheduledDate.lte = new Date(query.to);
    }

    const posts = await this.prisma.contentPost.findMany({
      where,
      include: postInclude,
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
    });

    return posts.map((post) => this.toPostResponse(post));
  }

  async getPostById(id: string) {
    const post = await this.prisma.contentPost.findUnique({
      where: { id },
      include: postInclude,
    });
    if (!post) throw new NotFoundException('Content post not found');
    return this.toPostResponse(post);
  }

  async createVersion(
    postId: string,
    userId: string,
    dto: CreatePostVersionDto,
  ) {
    await this.ensurePostExists(postId);

    const mediaUrls = dto.mediaUrls ?? [];

    const version = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.postVersion.findFirst({
        where: { postId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const versionNumber = (latest?.versionNumber ?? 0) + 1;

      const created = await tx.postVersion.create({
        data: {
          postId,
          versionNumber,
          title: dto.title,
          copyText: dto.copyText,
          mediaUrls,
          createdById: userId,
        },
        include: { createdBy: { select: userSelect } },
      });

      await tx.contentAttachment.deleteMany({ where: { postId } });
      await tx.contentPost.update({
        where: { id: postId },
        data: {
          title: dto.title,
          copy: dto.copyText,
          attachments: mediaUrls.length
            ? {
                create: mediaUrls.map((url, index) => ({
                  name: `media-${index + 1}`,
                  url,
                })),
              }
            : undefined,
        },
      });

      return created;
    });

    return this.toVersionResponse(version);
  }

  async approvePost(id: string) {
    const existing = await this.ensurePostExists(id);
    if (existing.internalReviewStatus !== InternalReviewStatus.APPROVED) {
      throw new BadRequestException(
        'Aprovação interna necessária antes de aprovar para o cliente',
      );
    }

    const post = await this.prisma.contentPost.update({
      where: { id },
      data: { status: ContentPostStatus.APPROVED },
      include: postInclude,
    });

    return this.toPostResponse(post);
  }

  async updateInternalReview(
    id: string,
    userId: string,
    role: string,
    dto: InternalReviewDto,
  ) {
    const existing = await this.ensurePostExists(id);

    const status = this.mapInternalReviewAction(dto.status);

    if (status === InternalReviewStatus.REJECTED && !dto.note?.trim()) {
      throw new BadRequestException(
        'Motivo da rejeição é obrigatório para revisão interna',
      );
    }

    if (
      status === InternalReviewStatus.APPROVED ||
      status === InternalReviewStatus.REJECTED
    ) {
      assertCanPerformInternalApproval(role);
    }

    if (status === InternalReviewStatus.APPROVED) {
      const hasDeliverables = await this.postHasDeliverables(id);
      if (!hasDeliverables) {
        throw new BadRequestException(
          'É necessário anexar pelo menos uma entrega antes da aprovação interna',
        );
      }
      if (existing.internalReviewStatus !== InternalReviewStatus.PENDING) {
        throw new BadRequestException(
          'O conteúdo precisa estar em revisão interna pendente antes da aprovação',
        );
      }
    }

    const post = await this.prisma.contentPost.update({
      where: { id },
      data: {
        internalReviewStatus: status,
        internalReviewNote: dto.note?.trim() ?? null,
        ...(status === InternalReviewStatus.APPROVED &&
        existing.status !== ContentPostStatus.PENDING_APPROVAL
          ? { status: ContentPostStatus.PENDING_APPROVAL }
          : {}),
      },
      include: postInclude,
    });

    if (
      status === InternalReviewStatus.APPROVED &&
      post.status === ContentPostStatus.PENDING_APPROVAL
    ) {
      await this.notifyPostPending(post);
    }

    return this.toPostResponse(post);
  }

  async rejectPost(id: string, userId: string, dto: RejectContentPostDto) {
    await this.ensurePostExists(id);

    const latestVersion = await this.prisma.postVersion.findFirst({
      where: { postId: id },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    const [post] = await this.prisma.$transaction([
      this.prisma.contentPost.update({
        where: { id },
        data: { status: ContentPostStatus.REJECTED },
        include: postInclude,
      }),
      this.prisma.postFeedback.create({
        data: {
          postId: id,
          versionId: latestVersion?.id,
          userId,
          comment: dto.rejectionReason,
          type: PostFeedbackType.REJECTION_REASON,
        },
      }),
    ]);

    const recipients = [post.assigneeId, post.userId].filter(
      (uid): uid is string => Boolean(uid),
    );
    await this.notifications.notifyPostRejected(
      recipients,
      post.title,
      post.client.companyName,
      dto.rejectionReason,
    );
    await this.integrations.notifyPostRejected({
      postTitle: post.title,
      clientName: post.client.companyName,
      reason: dto.rejectionReason,
      source: 'internal',
      postId: post.id,
    });

    await this.kanbanService.applyClientReviewOutcome(id, false, dto.rejectionReason);

    return this.toPostResponse(post);
  }

  async getPostInsights(postId: string) {
    const post = await this.ensurePostExists(postId);
    return this.metaInsights.getPostInsights(postId, post.clientId);
  }

  async getPostHistory(postId: string) {
    await this.ensurePostExists(postId);

    const [versions, feedback] = await Promise.all([
      this.prisma.postVersion.findMany({
        where: { postId },
        include: { createdBy: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.postFeedback.findMany({
        where: { postId },
        include: {
          user: { select: userSelect },
          version: { select: { id: true, versionNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const timeline = [
      ...versions.map((version) => ({
        kind: 'version' as const,
        id: version.id,
        createdAt: version.createdAt.toISOString(),
        data: this.toVersionResponse(version),
      })),
      ...feedback.map((entry) => ({
        kind: 'feedback' as const,
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        data: this.toFeedbackResponse(entry),
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      versions: versions.map((version) => this.toVersionResponse(version)),
      feedback: feedback.map((entry) => this.toFeedbackResponse(entry)),
      timeline,
    };
  }

  async createPost(userId: string, dto: CreateContentPostDto) {
    await this.ensureClientExists(dto.clientId);
    if (dto.assigneeId) await this.ensureUserExists(dto.assigneeId);

    const status = dto.status ?? ContentPostStatus.DRAFT;

    const post = await this.prisma.contentPost.create({
      data: {
        title: dto.title,
        clientId: dto.clientId,
        platform: dto.platform,
        format: dto.format,
        scheduledDate: dto.scheduledDate
          ? new Date(dto.scheduledDate)
          : null,
        status,
        copy: dto.copy,
        referenceUrl: dto.referenceUrl,
        userId,
        assigneeId: dto.assigneeId,
        attachments: dto.attachments?.length
          ? { create: dto.attachments }
          : undefined,
      },
      include: postInclude,
    });

    if (status === ContentPostStatus.PENDING_APPROVAL) {
      await this.notifyPostPending(post);
    }

    await this.calendar.syncEventFromPost(post, userId);

    return this.toPostResponse(post);
  }

  async updatePost(id: string, dto: UpdateContentPostDto) {
    const existing = await this.ensurePostExists(id);
    if (dto.clientId) await this.ensureClientExists(dto.clientId);
    if (dto.assigneeId) await this.ensureUserExists(dto.assigneeId);

    if (dto.status) {
      if (
        dto.status === ContentPostStatus.APPROVED ||
        dto.status === ContentPostStatus.REJECTED ||
        dto.status === ContentPostStatus.PENDING_APPROVAL
      ) {
        throw new BadRequestException(
          'Use o fluxo de aprovação interna e do cliente para alterar este status',
        );
      }
    }

    if (dto.attachments !== undefined) {
      await this.prisma.contentAttachment.deleteMany({ where: { postId: id } });
    }

    const post = await this.prisma.contentPost.update({
      where: { id },
      data: {
        title: dto.title,
        clientId: dto.clientId,
        platform: dto.platform,
        format: dto.format,
        scheduledDate:
          dto.scheduledDate !== undefined
            ? dto.scheduledDate
              ? new Date(dto.scheduledDate)
              : null
            : undefined,
        status: dto.status,
        copy: dto.copy,
        referenceUrl:
          dto.referenceUrl !== undefined ? dto.referenceUrl : undefined,
        assigneeId:
          dto.assigneeId !== undefined ? dto.assigneeId : undefined,
        attachments: dto.attachments?.length
          ? { create: dto.attachments }
          : undefined,
      },
      include: postInclude,
    });

    await this.calendar.syncEventFromPost(post, post.userId);

    return this.toPostResponse(post);
  }

  private async notifyPostPending(
    post: PostWithRelations,
  ) {
    const recipients: string[] = [];
    if (post.assigneeId) recipients.push(post.assigneeId);
    if (post.userId) recipients.push(post.userId);

    await this.notifications.notifyPostPending(
      recipients,
      post.title,
      post.client.companyName,
    );
  }

  async deletePost(id: string) {
    await this.ensurePostExists(id);
    await this.prisma.contentPost.delete({ where: { id } });
  }

  private async ensureClientExists(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (isClientFacingRole(user.role.name)) {
      throw new BadRequestException(
        'Usuários com perfil de cliente não podem ser responsáveis por conteúdo',
      );
    }
    return user;
  }

  private async postHasDeliverables(postId: string) {
    const attachmentCount = await this.prisma.contentAttachment.count({
      where: { postId },
    });
    if (attachmentCount > 0) return true;

    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId: postId },
      select: { id: true },
    });
    if (!task) return false;

    const assetCount = await this.prisma.kanbanTaskAsset.count({
      where: { taskId: task.id },
    });
    return assetCount > 0;
  }

  private async ensurePostExists(id: string) {
    const post = await this.prisma.contentPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Content post not found');
    return post;
  }

  private toPostResponse(post: PostWithRelations) {
    return {
      id: post.id,
      title: post.title,
      clientId: post.clientId,
      client: post.client,
      platform: post.platform.toLowerCase() as
        | 'instagram'
        | 'tiktok'
        | 'youtube'
        | 'linkedin',
      format: post.format.toLowerCase() as
        | 'carousel'
        | 'reels'
        | 'static'
        | 'story',
      scheduledDate: post.scheduledDate?.toISOString() ?? null,
      status: post.status.toLowerCase() as
        | 'draft'
        | 'pending_approval'
        | 'approved'
        | 'rejected'
        | 'scheduled'
        | 'published',
      internalReviewStatus: post.internalReviewStatus.toLowerCase() as
        | 'not_required'
        | 'pending'
        | 'approved'
        | 'rejected',
      internalReviewNote: post.internalReviewNote,
      copy: post.copy,
      referenceUrl: post.referenceUrl,
      attachments: post.attachments,
      author: post.user,
      assignee: post.assignee,
      platformColor: PLATFORM_COLORS[post.platform] ?? '#004949',
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private toVersionResponse(
    version: Prisma.PostVersionGetPayload<{
      include: { createdBy: { select: typeof userSelect } };
    }>,
  ) {
    return {
      id: version.id,
      postId: version.postId,
      versionNumber: version.versionNumber,
      versionLabel: this.formatVersionLabel(version.versionNumber),
      title: version.title,
      copyText: version.copyText,
      mediaUrls: version.mediaUrls,
      createdBy: version.createdBy,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private toFeedbackResponse(
    entry: Prisma.PostFeedbackGetPayload<{
      include: {
        user: { select: typeof userSelect };
        version: { select: { id: true; versionNumber: true } };
      };
    }>,
  ) {
    return {
      id: entry.id,
      postId: entry.postId,
      versionId: entry.versionId,
      versionLabel: entry.version
        ? this.formatVersionLabel(entry.version.versionNumber)
        : null,
      comment: entry.comment,
      type: entry.type.toLowerCase() as 'rejection_reason' | 'general_note',
      user: entry.user,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private formatVersionLabel(versionNumber: number) {
    const major = Math.floor((versionNumber - 1) / 10) + 1;
    const minor = (versionNumber - 1) % 10;
    return `v${major}.${minor}`;
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
}
