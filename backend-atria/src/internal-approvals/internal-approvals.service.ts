import { Injectable } from '@nestjs/common';
import {
  DeliverableApprovalStatus,
  DeliverableItemStatus,
  InternalReviewStatus,
  Prisma,
} from '@prisma/client';
import { assertCanPerformInternalApproval } from '../auth/utils/rbac';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveInternalApprovalDto } from './dto/approve-internal-approval.dto';
import { RequestAdjustmentDto } from './dto/request-adjustment.dto';

const pendingTaskInclude = {
  client: {
    select: { id: true, companyName: true, avatarUrl: true },
  },
  createdBy: {
    select: { id: true, name: true, avatarUrl: true },
  },
  assignees: {
    select: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  deliverable: {
    select: {
      id: true,
      approvalStatus: true,
      items: { select: { status: true } },
    },
  },
  _count: { select: { assets: true } },
} satisfies Prisma.KanbanTaskInclude;

@Injectable()
export class InternalApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliverablesService: DeliverablesService,
  ) {}

  async listPending(role: string) {
    assertCanPerformInternalApproval(role);

    const tasks = await this.prisma.kanbanTask.findMany({
      where: {
        deletedAt: null,
        isBypassingInternalReview: false,
        OR: [
          { internalReviewStatus: InternalReviewStatus.PENDING },
          {
            deliverable: {
              is: { approvalStatus: DeliverableApprovalStatus.PENDING_APPROVAL },
            },
          },
        ],
      },
      include: pendingTaskInclude,
      orderBy: { updatedAt: 'desc' },
    });

    return tasks.map((task) => this.toPendingResponse(task));
  }

  async approve(
    id: string,
    userId: string,
    role: string,
    dto: ApproveInternalApprovalDto = {},
  ) {
    assertCanPerformInternalApproval(role);
    return this.deliverablesService.approveInternal(
      id,
      userId,
      role,
      dto.note,
    );
  }

  async submitDelivery(
    id: string,
    userId: string,
    role: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    assertCanPerformInternalApproval(role);
    return this.deliverablesService.submit(id, userId, role, file, caption);
  }

  async requestAdjustment(
    id: string,
    userId: string,
    role: string,
    dto: RequestAdjustmentDto,
  ) {
    assertCanPerformInternalApproval(role);
    return this.deliverablesService.requestInternalAdjustment(
      id,
      userId,
      role,
      dto.note,
    );
  }

  private toPendingResponse(
    task: Prisma.KanbanTaskGetPayload<{ include: typeof pendingTaskInclude }>,
  ) {
    const items = task.deliverable?.items ?? [];

    return {
      id: task.deliverable?.id ?? task.id,
      title: task.title,
      description: task.description,
      postCaption: task.postCaption,
      kanbanTaskId: task.id,
      contentPostId: task.contentPostId,
      approvalStatus: task.deliverable?.approvalStatus.toLowerCase() ?? null,
      internalReviewStatus: task.internalReviewStatus.toLowerCase(),
      internalReviewNote: task.internalReviewNote,
      kanbanStatus: task.status.toLowerCase(),
      publicationDate: task.publicationDate?.toISOString() ?? null,
      deliveryDate: task.deliveryDate?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      assetCount: task._count.assets,
      client: task.client
        ? {
            id: task.client.id,
            companyName: task.client.companyName,
            avatarUrl: task.client.avatarUrl,
          }
        : null,
      createdBy: task.createdBy,
      assignees: task.assignees
        .map((assignee) => assignee.user)
        .filter((user): user is NonNullable<typeof user> => Boolean(user)),
      revisionSummary: {
        total: items.length,
        pending: items.filter((item) => item.status === DeliverableItemStatus.PENDING)
          .length,
        approved: items.filter(
          (item) => item.status === DeliverableItemStatus.APPROVED,
        ).length,
        requiresAdjustment: items.filter(
          (item) => item.status === DeliverableItemStatus.REQUIRES_ADJUSTMENT,
        ).length,
      },
      updatedAt: task.updatedAt.toISOString(),
      createdAt: task.createdAt.toISOString(),
    };
  }
}
