import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import {
  DeliverableApprovalStatus,
  DeliverableItemStatus,
  DeliverableMediaType,
  InternalReviewStatus,
  KanbanTaskStatus,
  PostFeedbackType,
  Prisma,
} from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { KanbanService } from '../kanban/kanban.service';
import { InternalReviewAction } from '../kanban/dto/internal-review.dto';
import { assertCanPerformInternalApproval } from '../auth/utils/rbac';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { RejectClientDeliverableDto } from './dto/client-review.dto';
import {
  mapClientPortalDeliverableStatus,
  QueryClientDeliverablesDto,
} from './dto/query-client-deliverables.dto';
import { RevisionDeliverableItemDto } from './dto/revision-item.dto';

const itemSelect = {
  id: true,
  deliverableId: true,
  mediaUrl: true,
  mediaType: true,
  status: true,
  adjustmentNotes: true,
  fileName: true,
  fileSize: true,
  storageBucket: true,
  storagePath: true,
  sourceAssetId: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeliverableItemSelect;

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    @Inject(forwardRef(() => KanbanService))
    private readonly kanbanService: KanbanService,
  ) {}

  async syncFromKanbanTask(taskId: string) {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assets: { orderBy: { uploadedAt: 'asc' } },
        client: { select: { id: true, companyName: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const deliverable = await this.prisma.deliverable.upsert({
      where: { kanbanTaskId: taskId },
      create: {
        companyId: task.companyId,
        title: task.title,
        clientId: task.clientId,
        kanbanTaskId: task.id,
        contentPostId: task.contentPostId,
        approvalStatus: this.mapInternalReviewToApproval(
          task.internalReviewStatus,
          task.isBypassingInternalReview,
        ),
      },
      update: {
        title: task.title,
        clientId: task.clientId,
        contentPostId: task.contentPostId,
      },
    });

    const existingItems = await this.prisma.deliverableItem.findMany({
      where: { deliverableId: deliverable.id },
      select: { id: true, sourceAssetId: true, mediaUrl: true },
    });

    const byAssetId = new Map(
      existingItems
        .filter((item) => item.sourceAssetId)
        .map((item) => [item.sourceAssetId!, item.id]),
    );
    const byUrl = new Map(existingItems.map((item) => [item.mediaUrl, item.id]));

    const keptItemIds = new Set<string>();
    let sortOrder = 0;
    for (const asset of task.assets) {
      const location = this.resolveStorageLocation(asset.fileUrl);
      const data = {
        mediaUrl: asset.fileUrl,
        mediaType: this.resolveMediaType(asset.fileType),
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        storageBucket: location?.bucket ?? null,
        storagePath: location?.path ?? null,
        sourceAssetId: asset.id,
        sortOrder,
      };
      sortOrder += 1;

      const existingId = byAssetId.get(asset.id) ?? byUrl.get(asset.fileUrl);
      if (existingId) {
        await this.prisma.deliverableItem.update({
          where: { id: existingId },
          data,
        });
        keptItemIds.add(existingId);
      } else {
        const created = await this.prisma.deliverableItem.create({
          data: {
            deliverableId: deliverable.id,
            status: DeliverableItemStatus.PENDING,
            ...data,
          },
          select: { id: true },
        });
        keptItemIds.add(created.id);
      }
    }

    const orphanIds = existingItems
      .map((item) => item.id)
      .filter((id) => !keptItemIds.has(id));
    if (orphanIds.length > 0) {
      await this.prisma.deliverableItem.deleteMany({
        where: { id: { in: orphanIds } },
      });
    }

    const record = await this.getDeliverableRecord(deliverable.id);
    if (!record) {
      throw new NotFoundException('Deliverable not found');
    }
    return record;
  }

  async findAllForClient(clientId: string, query: QueryClientDeliverablesDto = {}) {
    const where: Prisma.DeliverableWhereInput = {
      clientId,
    };

    if (query.status) {
      where.approvalStatus = mapClientPortalDeliverableStatus(query.status);
    }

    const dateRange = this.resolveMonthDateRange(query.month, query.year);
    if (dateRange) {
      where.OR = [
        { updatedAt: dateRange },
        { approvedAt: dateRange },
        { kanbanTask: { dueDate: dateRange } },
        { contentPost: { scheduledDate: dateRange } },
      ];
    }

    const deliverables = await this.prisma.deliverable.findMany({
      where,
      include: {
        items: {
          select: { status: true },
        },
        kanbanTask: {
          select: { dueDate: true },
        },
        contentPost: {
          select: { scheduledDate: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return deliverables.map((deliverable) => this.toClientListResponse(deliverable));
  }

  async approveInternal(
    deliverableId: string,
    userId: string,
    role: string,
    note?: string,
  ) {
    assertCanPerformInternalApproval(role);
    const deliverable = await this.requireDeliverableWithTask(deliverableId);
    await this.kanbanService.applyInternalApproval(
      deliverable.kanbanTaskId!,
      userId,
      role,
      note,
    );
    return this.getFullView(deliverable.id);
  }

  async requestInternalAdjustment(
    deliverableId: string,
    userId: string,
    role: string,
    note: string,
  ) {
    assertCanPerformInternalApproval(role);
    const deliverable = await this.requireDeliverableWithTask(deliverableId);
    await this.kanbanService.updateInternalReview(
      userId,
      role,
      deliverable.kanbanTaskId!,
      {
        status: InternalReviewAction.REJECTED,
        note,
      },
    );
    return this.getFullView(deliverable.id);
  }

  async submit(
    deliverableId: string,
    userId: string,
    role: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const deliverable = await this.requireDeliverableWithTask(deliverableId);
    return this.kanbanService.uploadTaskAsset(
      userId,
      role,
      deliverable.kanbanTaskId!,
      file,
      caption,
    );
  }

  async rejectClient(
    deliverableId: string,
    dto: RejectClientDeliverableDto,
    userId?: string | null,
  ) {
    const deliverable = await this.requireDeliverableWithTask(deliverableId);
    await this.kanbanService.applyClientRejection(
      deliverable.kanbanTaskId!,
      userId,
      dto.reason,
    );
    return this.getFullView(deliverable.id);
  }

  async approveClient(deliverableId: string, userId?: string | null) {
    const deliverable = await this.requireDeliverableWithTask(deliverableId);
    await this.kanbanService.applyClientApproval(
      deliverable.kanbanTaskId!,
      userId,
    );
    return this.getFullView(deliverable.id);
  }

  async markWaitingClientApproval(taskId: string) {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { kanbanTaskId: taskId },
      select: { id: true },
    });
    if (!deliverable) return;

    await this.prisma.deliverableItem.updateMany({
      where: { deliverableId: deliverable.id },
      data: {
        status: DeliverableItemStatus.PENDING,
        adjustmentNotes: null,
      },
    });

    await this.prisma.deliverable.update({
      where: { id: deliverable.id },
      data: {
        approvalStatus: DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL,
        approvedAt: null,
        approvedById: null,
      },
    });
  }

  async markRequiresAdjustment(taskId: string) {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { kanbanTaskId: taskId },
      select: { id: true },
    });
    if (!deliverable) return;

    await this.prisma.deliverable.update({
      where: { id: deliverable.id },
      data: {
        approvalStatus: DeliverableApprovalStatus.REQUIRES_ADJUSTMENT,
        approvedAt: null,
        approvedById: null,
      },
    });
  }

  async markClientApproved(taskId: string, approvedById?: string | null) {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { kanbanTaskId: taskId },
      select: { id: true },
    });
    if (!deliverable) return;

    await this.prisma.deliverableItem.updateMany({
      where: { deliverableId: deliverable.id },
      data: { status: DeliverableItemStatus.APPROVED },
    });

    await this.prisma.deliverable.update({
      where: { id: deliverable.id },
      data: {
        approvalStatus: DeliverableApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: approvedById ?? null,
      },
    });
  }

  async reviseItem(
    itemId: string,
    dto: RevisionDeliverableItemDto,
    actorUserId?: string | null,
  ) {
    const item = await this.prisma.deliverableItem.findUnique({
      where: { id: itemId },
      include: { deliverable: true },
    });

    if (!item) {
      throw new NotFoundException('Deliverable item not found');
    }

    if (
      dto.status !== DeliverableItemStatus.APPROVED &&
      dto.status !== DeliverableItemStatus.REQUIRES_ADJUSTMENT &&
      dto.status !== DeliverableItemStatus.PENDING
    ) {
      throw new BadRequestException('Invalid revision status');
    }

    const notes =
      dto.adjustmentNotes !== undefined
        ? dto.adjustmentNotes
        : dto.feedbackNotes;

    if (
      dto.status === DeliverableItemStatus.REQUIRES_ADJUSTMENT &&
      !notes?.trim()
    ) {
      throw new BadRequestException(
        'adjustmentNotes is required when marking media for adjustment',
      );
    }

    const updated = await this.prisma.deliverableItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        adjustmentNotes:
          notes !== undefined ? notes?.trim() || null : undefined,
      },
      select: itemSelect,
    });

    const nextStatus = await this.refreshDeliverableApproval(item.deliverableId);
    await this.syncKanbanFromApproval(
      item.deliverable.kanbanTaskId,
      nextStatus,
      actorUserId,
      notes,
    );

    return this.toItemResponse(updated);
  }

  async getDownload(itemId: string) {
    const item = await this.prisma.deliverableItem.findUnique({
      where: { id: itemId },
      select: itemSelect,
    });

    if (!item) {
      throw new NotFoundException('Deliverable item not found');
    }

    const fileName = item.fileName || this.guessFileName(item.mediaUrl);
    const location =
      item.storageBucket && item.storagePath
        ? { bucket: item.storageBucket, path: item.storagePath }
        : this.resolveStorageLocation(item.mediaUrl);

    if (location && this.storage.isConfigured) {
      const signed = await this.storage.createSignedDownloadUrl({
        bucket: location.bucket,
        path: location.path,
        downloadFileName: fileName,
      });

      const result = {
        itemId: item.id,
        fileName,
        mediaType: item.mediaType.toLowerCase(),
        downloadUrl: signed.signedUrl,
        expiresAt: signed.expiresAt,
        contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`,
        source: 'supabase' as const,
      };
      return result;
    }

    if (item.mediaUrl.startsWith('/uploads/')) {
      const absolute = join(process.cwd(), item.mediaUrl.replace(/^\//, ''));
      if (!existsSync(absolute)) {
        throw new NotFoundException('Media file not found on disk');
      }

      const result = {
        itemId: item.id,
        fileName,
        mediaType: item.mediaType.toLowerCase(),
        downloadUrl: item.mediaUrl,
        expiresAt: null,
        contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`,
        source: 'local' as const,
        streamPath: absolute,
      };
      return result;
    }

    if (item.mediaUrl.startsWith('http://') || item.mediaUrl.startsWith('https://')) {
      const result = {
        itemId: item.id,
        fileName,
        mediaType: item.mediaType.toLowerCase(),
        downloadUrl: item.mediaUrl,
        expiresAt: null,
        contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`,
        source: 'external' as const,
      };
      return result;
    }

    throw new ServiceUnavailableException(
      'Unable to generate a download URL for this media item',
    );
  }

  async getFullView(deliverableId: string) {
    let deliverable = await this.getDeliverableRecord(deliverableId);

    if (!deliverable) {
      deliverable = await this.prisma.deliverable.findUnique({
        where: { contentPostId: deliverableId },
        include: {
          client: { select: { id: true, companyName: true } },
          approvedBy: { select: { id: true, name: true, avatarUrl: true } },
          items: {
            select: itemSelect,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    }

    if (!deliverable && (await this.looksLikeTaskId(deliverableId))) {
      deliverable = await this.syncFromKanbanTask(deliverableId);
    }

    if (!deliverable) {
      const linkedTask = await this.prisma.kanbanTask.findFirst({
        where: { contentPostId: deliverableId, deletedAt: null },
        select: { id: true },
      });
      if (linkedTask) {
        deliverable = await this.syncFromKanbanTask(linkedTask.id);
      }
    }

    if (!deliverable) {
      throw new NotFoundException('Deliverable not found');
    }

    const view =
      deliverable.kanbanTaskId != null
        ? await this.syncFromKanbanTask(deliverable.kanbanTaskId)
        : deliverable;

    const task = view.kanbanTaskId
      ? await this.prisma.kanbanTask.findFirst({
          where: { id: view.kanbanTaskId, deletedAt: null },
          select: {
            status: true,
            isBypassingInternalReview: true,
            internalReviewStatus: true,
            internalReviewNote: true,
            postCaption: true,
          },
        })
      : null;

    const rejectionReason = await this.resolveRejectionReason(
      view.kanbanTaskId,
      view.contentPostId,
      task?.internalReviewNote ?? null,
    );

    const items = view.items;
    const counts = {
      total: items.length,
      pending: items.filter((item) => item.status === DeliverableItemStatus.PENDING)
        .length,
      approved: items.filter(
        (item) => item.status === DeliverableItemStatus.APPROVED,
      ).length,
      requiresAdjustment: items.filter(
        (item) => item.status === DeliverableItemStatus.REQUIRES_ADJUSTMENT,
      ).length,
    };

    let copy: string | null = null;
    if (view.contentPostId) {
      const contentPost = await this.prisma.contentPost.findUnique({
        where: { id: view.contentPostId },
        select: { copy: true },
      });
      copy = contentPost?.copy?.trim() || null;
    }
    if (!copy && task?.postCaption?.trim()) {
      copy = task.postCaption.trim();
    }

    return {
      id: view.id,
      title: view.title,
      copy,
      approval: {
        status: view.approvalStatus.toLowerCase(),
        approvedAt: view.approvedAt?.toISOString() ?? null,
        approvedBy: view.approvedBy
          ? {
              id: view.approvedBy.id,
              name: view.approvedBy.name,
              avatarUrl: view.approvedBy.avatarUrl,
            }
          : null,
      },
      workflow: {
        isBypassingInternalReview: task?.isBypassingInternalReview ?? false,
        kanbanStatus: task?.status?.toLowerCase() ?? null,
        internalReviewStatus: task?.internalReviewStatus?.toLowerCase() ?? null,
        internalReviewNote: task?.internalReviewNote?.trim() || null,
        rejectionReason,
      },
      client: view.client
        ? {
            id: view.client.id,
            companyName: view.client.companyName,
          }
        : null,
      links: {
        kanbanTaskId: view.kanbanTaskId,
        contentPostId: view.contentPostId,
      },
      media: {
        images: items
          .filter((item) => item.mediaType === DeliverableMediaType.IMAGE)
          .map((item) => this.toItemResponse(item)),
        videos: items
          .filter((item) => item.mediaType === DeliverableMediaType.VIDEO)
          .map((item) => this.toItemResponse(item)),
        other: items
          .filter((item) => item.mediaType === DeliverableMediaType.OTHER)
          .map((item) => this.toItemResponse(item)),
        all: items.map((item) => this.toItemResponse(item)),
      },
      revisionSummary: counts,
      updatedAt: view.updatedAt.toISOString(),
      createdAt: view.createdAt.toISOString(),
    };
  }

  openLocalFileStream(absolutePath: string) {
    return createReadStream(absolutePath);
  }

  private resolveMonthDateRange(month?: number, year?: number) {
    if (!month && !year) {
      return null;
    }

    const resolvedYear = year ?? new Date().getFullYear();

    if (month) {
      const start = new Date(resolvedYear, month - 1, 1);
      const end = new Date(resolvedYear, month, 0, 23, 59, 59, 999);
      return { gte: start, lte: end };
    }

    const start = new Date(resolvedYear, 0, 1);
    const end = new Date(resolvedYear, 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  private toClientListResponse(deliverable: {
    id: string;
    title: string;
    approvalStatus: DeliverableApprovalStatus;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    kanbanTaskId: string | null;
    contentPostId: string | null;
    items: Array<{ status: DeliverableItemStatus }>;
    kanbanTask: { dueDate: Date | null } | null;
    contentPost: { scheduledDate: Date | null } | null;
  }) {
    const deliveryDate =
      deliverable.approvedAt ??
      deliverable.kanbanTask?.dueDate ??
      deliverable.contentPost?.scheduledDate ??
      deliverable.updatedAt;

    return {
      id: deliverable.id,
      title: deliverable.title,
      approvalStatus: deliverable.approvalStatus.toLowerCase(),
      deliveryDate: deliveryDate.toISOString(),
      updatedAt: deliverable.updatedAt.toISOString(),
      createdAt: deliverable.createdAt.toISOString(),
      links: {
        kanbanTaskId: deliverable.kanbanTaskId,
        contentPostId: deliverable.contentPostId,
      },
      revisionSummary: {
        total: deliverable.items.length,
        pending: deliverable.items.filter(
          (item) => item.status === DeliverableItemStatus.PENDING,
        ).length,
        approved: deliverable.items.filter(
          (item) => item.status === DeliverableItemStatus.APPROVED,
        ).length,
        requiresAdjustment: deliverable.items.filter(
          (item) => item.status === DeliverableItemStatus.REQUIRES_ADJUSTMENT,
        ).length,
      },
    };
  }

  private async requireDeliverableWithTask(deliverableId: string) {
    let deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: {
        id: true,
        kanbanTaskId: true,
        contentPostId: true,
      },
    });

    if (!deliverable) {
      const byTask = await this.prisma.deliverable.findUnique({
        where: { kanbanTaskId: deliverableId },
        select: {
          id: true,
          kanbanTaskId: true,
          contentPostId: true,
        },
      });
      deliverable = byTask;
    }

    if (!deliverable?.kanbanTaskId) {
      const synced = await this.looksLikeTaskId(deliverableId)
        ? await this.syncFromKanbanTask(deliverableId)
        : null;
      if (!synced?.kanbanTaskId) {
        throw new NotFoundException(
          'Deliverable linked to a Kanban task was not found',
        );
      }
      return {
        id: synced.id,
        kanbanTaskId: synced.kanbanTaskId,
        contentPostId: synced.contentPostId,
      };
    }

    return deliverable;
  }

  private async refreshDeliverableApproval(deliverableId: string) {
    const [items, current] = await Promise.all([
      this.prisma.deliverableItem.findMany({
        where: { deliverableId },
        select: { status: true },
      }),
      this.prisma.deliverable.findUnique({
        where: { id: deliverableId },
        select: { approvalStatus: true },
      }),
    ]);

    let approvalStatus: DeliverableApprovalStatus =
      DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;

    if (items.length === 0) {
      approvalStatus = DeliverableApprovalStatus.DRAFT;
    } else if (
      items.some((item) => item.status === DeliverableItemStatus.REQUIRES_ADJUSTMENT)
    ) {
      approvalStatus = DeliverableApprovalStatus.REQUIRES_ADJUSTMENT;
    } else if (
      items.every((item) => item.status === DeliverableItemStatus.APPROVED)
    ) {
      approvalStatus = DeliverableApprovalStatus.APPROVED;
    } else if (
      current?.approvalStatus === DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL ||
      current?.approvalStatus === DeliverableApprovalStatus.PENDING_APPROVAL
    ) {
      approvalStatus = DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
    } else {
      approvalStatus = DeliverableApprovalStatus.PENDING_APPROVAL;
    }

    await this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        approvalStatus,
        approvedAt:
          approvalStatus === DeliverableApprovalStatus.APPROVED
            ? new Date()
            : null,
        approvedById:
          approvalStatus === DeliverableApprovalStatus.APPROVED
            ? undefined
            : null,
      },
    });

    return approvalStatus;
  }

  private async syncKanbanFromApproval(
    kanbanTaskId: string | null,
    approvalStatus: DeliverableApprovalStatus,
    actorUserId?: string | null,
    reason?: string | null,
  ) {
    if (!kanbanTaskId) return;

    if (approvalStatus === DeliverableApprovalStatus.REQUIRES_ADJUSTMENT) {
      const task = await this.prisma.kanbanTask.findFirst({
        where: { id: kanbanTaskId, deletedAt: null },
        select: {
          status: true,
          internalReviewStatus: true,
        },
      });
      if (!task) return;

      const isClientReviewPhase =
        task.status === KanbanTaskStatus.JHONATAN_APROVOU ||
        task.internalReviewStatus === InternalReviewStatus.APPROVED;

      if (isClientReviewPhase) {
        await this.kanbanService.applyClientRejection(
          kanbanTaskId,
          actorUserId,
          reason,
        );
      } else {
        await this.kanbanService.applyInternalAdjustment(
          kanbanTaskId,
          actorUserId,
          reason,
        );
      }
      return;
    }

    if (approvalStatus === DeliverableApprovalStatus.APPROVED) {
      await this.kanbanService.applyClientApproval(kanbanTaskId, actorUserId);
    }
  }

  private async getDeliverableRecord(id: string) {
    return this.prisma.deliverable.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        approvedBy: { select: { id: true, name: true, avatarUrl: true } },
        items: {
          select: itemSelect,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  private async looksLikeTaskId(id: string) {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    return Boolean(task);
  }

  private resolveStorageLocation(mediaUrl: string) {
    return this.storage.extractStorageLocation(mediaUrl);
  }

  private resolveMediaType(mimeOrType: string): DeliverableMediaType {
    const value = mimeOrType.toLowerCase();
    if (value.startsWith('image/')) return DeliverableMediaType.IMAGE;
    if (value.startsWith('video/')) return DeliverableMediaType.VIDEO;
    if (['image', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(value)) {
      return DeliverableMediaType.IMAGE;
    }
    if (['video', 'mp4', 'mov', 'quicktime'].includes(value)) {
      return DeliverableMediaType.VIDEO;
    }
    return DeliverableMediaType.OTHER;
  }

  private mapInternalReviewToApproval(
    status: string,
    isBypassingInternalReview = false,
  ): DeliverableApprovalStatus {
    if (isBypassingInternalReview && status === 'APPROVED') {
      return DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
    }

    switch (status) {
      case 'APPROVED':
        return DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
      case 'REJECTED':
        return DeliverableApprovalStatus.REQUIRES_ADJUSTMENT;
      case 'PENDING':
        return DeliverableApprovalStatus.PENDING_APPROVAL;
      default:
        return DeliverableApprovalStatus.DRAFT;
    }
  }

  private async resolveRejectionReason(
    kanbanTaskId: string | null,
    contentPostId: string | null,
    kanbanNote: string | null,
  ): Promise<string | null> {
    if (kanbanNote?.trim()) {
      return kanbanNote.trim();
    }

    if (contentPostId) {
      const post = await this.prisma.contentPost.findUnique({
        where: { id: contentPostId },
        select: { internalReviewNote: true },
      });
      if (post?.internalReviewNote?.trim()) {
        return post.internalReviewNote.trim();
      }

      const feedback = await this.prisma.postFeedback.findFirst({
        where: {
          postId: contentPostId,
          type: PostFeedbackType.REJECTION_REASON,
        },
        orderBy: { createdAt: 'desc' },
        select: { comment: true },
      });
      if (feedback?.comment?.trim()) {
        return feedback.comment.trim();
      }
    }

    if (kanbanTaskId) {
      const task = await this.prisma.kanbanTask.findFirst({
        where: { id: kanbanTaskId, deletedAt: null },
        select: { internalReviewNote: true },
      });
      if (task?.internalReviewNote?.trim()) {
        return task.internalReviewNote.trim();
      }
    }

    return null;
  }

  private guessFileName(mediaUrl: string) {
    try {
      const pathname = new URL(mediaUrl, 'http://localhost').pathname;
      const base = pathname.split('/').pop();
      return base && base.trim() ? base : 'download.bin';
    } catch {
      return 'download.bin';
    }
  }

  private toItemResponse(item: {
    id: string;
    deliverableId: string;
    mediaUrl: string;
    mediaType: DeliverableMediaType;
    status: DeliverableItemStatus;
    adjustmentNotes: string | null;
    fileName: string | null;
    fileSize: number | null;
    sourceAssetId?: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      deliverableId: item.deliverableId,
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType.toLowerCase(),
      status: item.status.toLowerCase(),
      adjustmentNotes: item.adjustmentNotes,
      feedbackNotes: item.adjustmentNotes,
      fileName: item.fileName,
      fileSize: item.fileSize,
      sourceAssetId: item.sourceAssetId ?? null,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
