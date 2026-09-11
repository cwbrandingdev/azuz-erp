import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ContentPostStatus,
  ContractStatus,
  KanbanTaskPriority,
  PostFeedbackType,
  Prisma,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AssetsService } from '../assets/assets.service';
import { ContractsService } from '../contracts/contracts.service';
import { FinanceService } from '../finance/finance.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { KanbanService } from '../kanban/kanban.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildCalendarGridWhere } from '../calendar/calendar-event-query';
import { PrismaService } from '../prisma/prisma.service';
import { SlaService } from '../sla/sla.service';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const clientSelect = {
  id: true,
  companyName: true,
  contactName: true,
  email: true,
  avatarUrl: true,
  instagram: true,
  isActive: true,
  hasCrmEnabled: true,
} as const;

const reportInclude = {
  client: { select: clientSelect },
  generatedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ClientReportInclude;

const PORTAL_TOKEN_TTL_DAYS = 365;

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: ContractsService,
    private readonly assetsService: AssetsService,
    private readonly notifications: NotificationsService,
    private readonly integrations: IntegrationsService,
    private readonly slaService: SlaService,
    private readonly financeService: FinanceService,
    private readonly kanbanService: KanbanService,
  ) {}

  async generatePortalToken(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PORTAL_TOKEN_TTL_DAYS);

    await this.prisma.clientPortalToken.upsert({
      where: { clientId },
      create: { clientId, tokenHash, isActive: true, expiresAt },
      update: {
        tokenHash,
        isActive: true,
        expiresAt,
        lastAccessedAt: null,
      },
    });

    return {
      clientId: client.id,
      companyName: client.companyName,
      token: rawToken,
      portalUrl: `/portal/${rawToken}`,
    };
  }

  async getPortalData(rawToken: string) {
    const portalToken = await this.resolvePortalToken(rawToken);

    await this.prisma.clientPortalToken.update({
      where: { id: portalToken.id },
      data: { lastAccessedAt: new Date() },
    });

    return this.getPortalDataForClient(portalToken.clientId);
  }

  async getPortalDataForClient(clientId: string) {
    const [
      client,
      pendingPosts,
      scheduledPosts,
      pipelinePosts,
      reports,
      contracts,
      overview,
      recentBriefs,
    ] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: clientSelect,
      }),
      this.prisma.contentPost.findMany({
        where: { clientId, status: ContentPostStatus.PENDING_APPROVAL },
        orderBy: { scheduledDate: 'asc' },
        take: 30,
        include: { attachments: true },
      }),
      this.prisma.contentPost.findMany({
        where: { clientId, status: ContentPostStatus.SCHEDULED },
        orderBy: { scheduledDate: 'asc' },
        take: 15,
        include: { attachments: true },
      }),
      this.prisma.contentPost.findMany({
        where: {
          clientId,
          status: {
            in: [
              ContentPostStatus.PENDING_APPROVAL,
              ContentPostStatus.APPROVED,
              ContentPostStatus.SCHEDULED,
              ContentPostStatus.PUBLISHED,
              ContentPostStatus.REJECTED,
            ],
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: {
          attachments: true,
          feedback: {
            where: { type: PostFeedbackType.REJECTION_REASON },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.clientReport.findMany({
        where: { clientId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
        select: {
          id: true,
          title: true,
          month: true,
          year: true,
          createdAt: true,
        },
      }),
      this.prisma.contract.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          recurringValue: true,
          paymentFrequency: true,
          startDate: true,
          endDate: true,
          pdfUrl: true,
          termsContent: true,
        },
      }),
      this.getContentOverview(clientId),
      this.prisma.clientBrief.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
        },
      }),
    ]);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.isActive) {
      throw new ForbiddenException('Client account is deactivated');
    }

    const signedContracts = contracts.filter(
      (c) => c.status === ContractStatus.SIGNED,
    );

    return {
      client,
      accountStatus: {
        activeContracts: signedContracts.length,
        pendingApprovals: overview.pendingApproval,
        scheduledPosts: overview.scheduled,
        publishedPosts: overview.published,
        status:
          signedContracts.length > 0
            ? ('active' as const)
            : ('onboarding' as const),
      },
      pendingApprovalPosts: pendingPosts.map((p) => this.toPortalPost(p)),
      scheduledPosts: scheduledPosts.map((p) => this.toPortalPost(p)),
      contentPipeline: pipelinePosts.map((p) => ({
        ...this.toPortalPost(p),
        updatedAt: p.updatedAt.toISOString(),
        latestFeedback: p.feedback[0]
          ? {
              comment: p.feedback[0].comment,
              createdAt: p.feedback[0].createdAt.toISOString(),
            }
          : null,
      })),
      recentReports: reports.map((r) => ({
        id: r.id,
        title: r.title,
        month: r.month,
        year: r.year,
        periodLabel: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
        createdAt: r.createdAt.toISOString(),
      })),
      contracts: contracts.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status.toLowerCase(),
        recurringValue: Number(c.recurringValue),
        paymentFrequency: c.paymentFrequency.toLowerCase(),
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
        pdfUrl: c.pdfUrl,
        hasTerms: Boolean(c.termsContent?.trim()),
      })),
      recentBriefs: recentBriefs.map((b) => ({
        id: b.id,
        title: b.title,
        content: b.content,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  async getClientPortalCalendar(
    clientId: string,
    from?: string,
    to?: string,
  ) {
    const scheduledDateFilter: Prisma.DateTimeFilter = {};
    if (from) scheduledDateFilter.gte = new Date(from);
    if (to) scheduledDateFilter.lte = new Date(to);

    const [events, posts] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: buildCalendarGridWhere({ from, to, clientId }),
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          endAt: true,
          category: true,
          color: true,
          isPending: true,
          contentPostId: true,
          kanbanTask: { select: { publicationDate: true } },
        },
      }),
      this.prisma.contentPost.findMany({
        where: {
          clientId,
          scheduledDate: {
            not: null,
            ...(Object.keys(scheduledDateFilter).length
              ? scheduledDateFilter
              : {}),
          },
          status: {
            in: [
              ContentPostStatus.PENDING_APPROVAL,
              ContentPostStatus.APPROVED,
              ContentPostStatus.SCHEDULED,
              ContentPostStatus.PUBLISHED,
            ],
          },
        },
        orderBy: { scheduledDate: 'asc' },
        select: {
          id: true,
          title: true,
          status: true,
          platform: true,
          format: true,
          scheduledDate: true,
        },
      }),
    ]);

    const mappedEvents = events
      .map((event) => {
        const publicationDate =
          event.kanbanTask?.publicationDate ?? event.startAt;
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          publicationDate: publicationDate.toISOString(),
          startAt: publicationDate.toISOString(),
          endAt: event.endAt.toISOString(),
          category: event.category.toLowerCase(),
          color: event.color,
          isPending: event.isPending,
          contentPostId: event.contentPostId,
          type: 'event' as const,
        };
      })
      .sort(
        (left, right) =>
          new Date(left.publicationDate).getTime() -
          new Date(right.publicationDate).getTime(),
      );

    return {
      events: mappedEvents,
      content: posts.map((post) => ({
        id: post.id,
        title: post.title,
        status: post.status.toLowerCase(),
        platform: post.platform.toLowerCase(),
        format: post.format.toLowerCase(),
        scheduledDate: post.scheduledDate!.toISOString(),
        type: 'content' as const,
      })),
    };
  }

  async getPortalReport(rawToken: string, reportId: string) {
    const portalToken = await this.resolvePortalToken(rawToken);
    const report = await this.prisma.clientReport.findFirst({
      where: { id: reportId, clientId: portalToken.clientId },
      include: reportInclude,
    });
    if (!report) throw new NotFoundException('Report not found');
    return {
      id: report.id,
      clientId: report.clientId,
      client: report.client,
      month: report.month,
      year: report.year,
      title: report.title,
      data: report.data,
      generatedBy: report.generatedBy,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async getPortalPost(rawToken: string, postId: string) {
    const { clientId } = await this.resolvePortalToken(rawToken);
    const post = await this.prisma.contentPost.findFirst({
      where: { id: postId, clientId },
      include: {
        attachments: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
          include: {
            createdBy: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.toPortalPostDetail(post);
  }

  async approvePortalPost(rawToken: string, postId: string) {
    const { clientId } = await this.resolvePortalToken(rawToken);
    const post = await this.prisma.contentPost.findFirst({
      where: {
        id: postId,
        clientId,
        status: ContentPostStatus.PENDING_APPROVAL,
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found or not pending approval');
    }

    const updated = await this.prisma.contentPost.update({
      where: { id: postId },
      data: { status: ContentPostStatus.APPROVED },
      include: { attachments: true },
    });

    await this.kanbanService.applyClientReviewOutcome(postId, true);

    return this.toPortalPost(updated);
  }

  async rejectPortalPost(
    rawToken: string,
    postId: string,
    dto: PortalRejectPostDto,
  ) {
    const { clientId } = await this.resolvePortalToken(rawToken);
    const post = await this.prisma.contentPost.findFirst({
      where: {
        id: postId,
        clientId,
        status: ContentPostStatus.PENDING_APPROVAL,
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found or not pending approval');
    }

    const latestVersion = await this.prisma.postVersion.findFirst({
      where: { postId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    const feedbackUserId = post.assigneeId ?? post.userId;

    const [updated] = await this.prisma.$transaction([
      this.prisma.contentPost.update({
        where: { id: postId },
        data: { status: ContentPostStatus.REJECTED },
        include: {
          attachments: true,
          client: { select: { companyName: true } },
        },
      }),
      this.prisma.postFeedback.create({
        data: {
          postId,
          versionId: latestVersion?.id,
          userId: feedbackUserId,
          comment: `[Cliente via Portal] ${dto.rejectionReason}`,
          type: PostFeedbackType.REJECTION_REASON,
        },
      }),
    ]);

    await this.kanbanService.applyClientReviewOutcome(
      postId,
      false,
      dto.rejectionReason,
    );

    const recipients = [post.assigneeId, post.userId].filter(
      (uid): uid is string => Boolean(uid),
    );
    await this.notifications.notifyPostRejected(
      recipients,
      updated.title,
      updated.client.companyName,
      dto.rejectionReason,
    );
    await this.integrations.notifyPostRejected({
      postTitle: updated.title,
      clientName: updated.client.companyName,
      reason: dto.rejectionReason,
      source: 'portal',
      postId: updated.id,
    });

    return this.toPortalPost(updated);
  }

  async getPortalContract(rawToken: string, contractId: string) {
    const { clientId } = await this.resolvePortalToken(rawToken);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, clientId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            street: true,
            number: true,
            city: true,
            state: true,
            zipCode: true,
            avatarUrl: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    return {
      id: contract.id,
      clientId: contract.clientId,
      client: contract.client,
      title: contract.title,
      status: contract.status.toLowerCase(),
      recurringValue: Number(contract.recurringValue),
      paymentFrequency: contract.paymentFrequency.toLowerCase(),
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate?.toISOString() ?? null,
      termsContent: contract.termsContent,
      pdfUrl: contract.pdfUrl,
      createdBy: contract.createdBy,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
    };
  }

  async signPortalContract(rawToken: string, contractId: string) {
    const { clientId } = await this.resolvePortalToken(rawToken);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, clientId },
      select: { id: true, createdById: true, status: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    if (contract.status === ContractStatus.SIGNED) {
      throw new BadRequestException('Contract is already signed');
    }

    if (
      contract.status !== ContractStatus.SENT &&
      contract.status !== ContractStatus.DRAFT
    ) {
      throw new BadRequestException('Contract cannot be signed');
    }

    return this.contractsService.signContract(
      contract.createdById,
      contractId,
      'portal',
    );
  }

  async uploadPortalAsset(
    rawToken: string,
    file: Express.Multer.File,
    fileType?: string,
  ) {
    const { clientId } = await this.resolvePortalToken(rawToken);

    return this.assetsService.upload(null, {
      clientId,
      fileType: (fileType?.toUpperCase() ?? 'DOCUMENT') as
        | 'IMAGE'
        | 'LOGO'
        | 'BRAND_GUIDE'
        | 'DOCUMENT',
    }, file);
  }

  async createBriefing(rawToken: string, dto: PortalBriefingDto) {
    const { clientId } = await this.resolvePortalToken(rawToken);

    const createdAt = new Date();
    const slaDueDates = await this.slaService.computeDueDatesForPriority(
      KanbanTaskPriority.MEDIUM,
      createdAt,
    );

    const brief = await this.prisma.clientBrief.create({
      data: {
        clientId,
        title: dto.title,
        content: dto.content,
        source: 'portal',
        priority: KanbanTaskPriority.MEDIUM,
        slaResponseDueAt: slaDueDates.slaResponseDueAt,
        slaResolutionDueAt: slaDueDates.slaResolutionDueAt,
      },
    });

    return {
      id: brief.id,
      title: brief.title,
      content: brief.content,
      createdAt: brief.createdAt.toISOString(),
    };
  }

  async getPortalReportForClient(clientId: string, reportId: string) {
    return this.getPortalReportByClientId(clientId, reportId);
  }

  private async getPortalReportByClientId(clientId: string, reportId: string) {
    const report = await this.prisma.clientReport.findFirst({
      where: { id: reportId, clientId },
      include: reportInclude,
    });
    if (!report) throw new NotFoundException('Report not found');
    return {
      id: report.id,
      clientId: report.clientId,
      client: report.client,
      month: report.month,
      year: report.year,
      title: report.title,
      data: report.data,
      generatedBy: report.generatedBy,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async getPortalPostForClient(clientId: string, postId: string) {
    const post = await this.prisma.contentPost.findFirst({
      where: { id: postId, clientId },
      include: {
        attachments: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
          include: {
            createdBy: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.toPortalPostDetail(post);
  }

  approvePortalPostForClient(clientId: string, postId: string) {
    return this.approvePortalPostByClientId(clientId, postId);
  }

  private async approvePortalPostByClientId(clientId: string, postId: string) {
    const post = await this.prisma.contentPost.findFirst({
      where: {
        id: postId,
        clientId,
        status: ContentPostStatus.PENDING_APPROVAL,
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found or not pending approval');
    }

    const updated = await this.prisma.contentPost.update({
      where: { id: postId },
      data: { status: ContentPostStatus.APPROVED },
      include: { attachments: true },
    });

    await this.kanbanService.applyClientReviewOutcome(postId, true);

    return this.toPortalPost(updated);
  }

  rejectPortalPostForClient(
    clientId: string,
    postId: string,
    dto: PortalRejectPostDto,
  ) {
    return this.rejectPortalPostByClientId(clientId, postId, dto);
  }

  private async rejectPortalPostByClientId(
    clientId: string,
    postId: string,
    dto: PortalRejectPostDto,
  ) {
    const post = await this.prisma.contentPost.findFirst({
      where: {
        id: postId,
        clientId,
        status: ContentPostStatus.PENDING_APPROVAL,
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found or not pending approval');
    }

    const latestVersion = await this.prisma.postVersion.findFirst({
      where: { postId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    const feedbackUserId = post.assigneeId ?? post.userId;

    const [updated] = await this.prisma.$transaction([
      this.prisma.contentPost.update({
        where: { id: postId },
        data: { status: ContentPostStatus.REJECTED },
        include: {
          attachments: true,
          client: { select: { companyName: true } },
        },
      }),
      this.prisma.postFeedback.create({
        data: {
          postId,
          versionId: latestVersion?.id,
          userId: feedbackUserId,
          comment: `[Cliente via Portal] ${dto.rejectionReason}`,
          type: PostFeedbackType.REJECTION_REASON,
        },
      }),
    ]);

    await this.kanbanService.applyClientReviewOutcome(
      postId,
      false,
      dto.rejectionReason,
    );

    const recipients = [post.assigneeId, post.userId].filter(
      (uid): uid is string => Boolean(uid),
    );
    await this.notifications.notifyPostRejected(
      recipients,
      updated.title,
      updated.client.companyName,
      dto.rejectionReason,
    );
    await this.integrations.notifyPostRejected({
      postTitle: updated.title,
      clientName: updated.client.companyName,
      reason: dto.rejectionReason,
      source: 'portal',
      postId: updated.id,
    });

    return this.toPortalPost(updated);
  }

  getPortalContractForClient(clientId: string, contractId: string) {
    return this.getPortalContractByClientId(clientId, contractId);
  }

  private async getPortalContractByClientId(
    clientId: string,
    contractId: string,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, clientId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            street: true,
            number: true,
            city: true,
            state: true,
            zipCode: true,
            avatarUrl: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    return {
      id: contract.id,
      clientId: contract.clientId,
      client: contract.client,
      title: contract.title,
      status: contract.status.toLowerCase(),
      recurringValue: Number(contract.recurringValue),
      paymentFrequency: contract.paymentFrequency.toLowerCase(),
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate?.toISOString() ?? null,
      termsContent: contract.termsContent,
      pdfUrl: contract.pdfUrl,
      createdBy: contract.createdBy,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
    };
  }

  signPortalContractForClient(clientId: string, contractId: string) {
    return this.signPortalContractByClientId(clientId, contractId);
  }

  getClientFinancesForClient(clientId: string) {
    return this.financeService.getClientFinances(clientId);
  }

  async getClientFinancesByToken(rawToken: string) {
    const portalToken = await this.resolvePortalToken(rawToken);
    return this.getClientFinancesForClient(portalToken.clientId);
  }

  private async signPortalContractByClientId(
    clientId: string,
    contractId: string,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, clientId },
      select: { id: true, createdById: true, status: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    if (contract.status === ContractStatus.SIGNED) {
      throw new BadRequestException('Contract is already signed');
    }

    if (
      contract.status !== ContractStatus.SENT &&
      contract.status !== ContractStatus.DRAFT
    ) {
      throw new BadRequestException('Contract cannot be signed');
    }

    return this.contractsService.signContract(
      contract.createdById,
      contractId,
      'portal',
    );
  }

  uploadPortalAssetForClient(
    clientId: string,
    file: Express.Multer.File,
    fileType?: string,
  ) {
    return this.assetsService.upload(null, {
      clientId,
      fileType: (fileType?.toUpperCase() ?? 'DOCUMENT') as
        | 'IMAGE'
        | 'LOGO'
        | 'BRAND_GUIDE'
        | 'DOCUMENT',
    }, file);
  }

  createBriefingForClient(clientId: string, dto: PortalBriefingDto) {
    return this.createBriefingByClientId(clientId, dto);
  }

  private async createBriefingByClientId(
    clientId: string,
    dto: PortalBriefingDto,
  ) {
    const createdAt = new Date();
    const slaDueDates = await this.slaService.computeDueDatesForPriority(
      KanbanTaskPriority.MEDIUM,
      createdAt,
    );

    const brief = await this.prisma.clientBrief.create({
      data: {
        clientId,
        title: dto.title,
        content: dto.content,
        source: 'portal',
        priority: KanbanTaskPriority.MEDIUM,
        slaResponseDueAt: slaDueDates.slaResponseDueAt,
        slaResolutionDueAt: slaDueDates.slaResolutionDueAt,
      },
    });

    return {
      id: brief.id,
      title: brief.title,
      content: brief.content,
      createdAt: brief.createdAt.toISOString(),
    };
  }

  private async resolvePortalToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const portalToken = await this.prisma.clientPortalToken.findFirst({
      where: { tokenHash, isActive: true },
    });

    if (!portalToken) {
      throw new UnauthorizedException('Invalid or revoked portal token');
    }

    if (portalToken.expiresAt && portalToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Portal token has expired');
    }

    return portalToken;
  }

  private hashToken(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async getContentOverview(clientId: string) {
    const [pendingApproval, scheduled, published] = await Promise.all([
      this.prisma.contentPost.count({
        where: { clientId, status: ContentPostStatus.PENDING_APPROVAL },
      }),
      this.prisma.contentPost.count({
        where: { clientId, status: ContentPostStatus.SCHEDULED },
      }),
      this.prisma.contentPost.count({
        where: { clientId, status: ContentPostStatus.PUBLISHED },
      }),
    ]);

    return { pendingApproval, scheduled, published };
  }

  private toPortalPost(
    post: {
      id: string;
      title: string;
      platform: string;
      format: string;
      scheduledDate: Date | null;
      status: string;
      copy?: string;
      attachments?: Array<{
        id: string;
        name: string;
        url: string;
        mimeType: string | null;
      }>;
    },
  ) {
    return {
      id: post.id,
      title: post.title,
      platform: post.platform.toLowerCase(),
      format: post.format.toLowerCase(),
      scheduledDate: post.scheduledDate?.toISOString() ?? null,
      status: post.status.toLowerCase(),
      copy: post.copy,
      attachments: post.attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        mimeType: a.mimeType,
      })),
    };
  }

  private toPortalPostDetail(
    post: Prisma.ContentPostGetPayload<{
      include: {
        attachments: true;
        versions: {
          include: { createdBy: { select: { id: true; name: true; avatarUrl: true } } };
        };
      };
    }>,
  ) {
    return {
      ...this.toPortalPost(post),
      copy: post.copy,
      versions: post.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        title: v.title,
        copyText: v.copyText,
        mediaUrls: v.mediaUrls,
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }
}
