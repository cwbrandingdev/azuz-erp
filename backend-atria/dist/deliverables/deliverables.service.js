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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverablesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const kanban_service_1 = require("../kanban/kanban.service");
const internal_review_dto_1 = require("../kanban/dto/internal-review.dto");
const rbac_1 = require("../auth/utils/rbac");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_storage_service_1 = require("../supabase/supabase-storage.service");
const query_client_deliverables_dto_1 = require("./dto/query-client-deliverables.dto");
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
};
let DeliverablesService = class DeliverablesService {
    prisma;
    storage;
    kanbanService;
    constructor(prisma, storage, kanbanService) {
        this.prisma = prisma;
        this.storage = storage;
        this.kanbanService = kanbanService;
    }
    async syncFromKanbanTask(taskId) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: {
                assets: { orderBy: { uploadedAt: 'asc' } },
                client: { select: { id: true, companyName: true } },
            },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const deliverable = await this.prisma.deliverable.upsert({
            where: { kanbanTaskId: taskId },
            create: {
                companyId: task.companyId,
                title: task.title,
                clientId: task.clientId,
                kanbanTaskId: task.id,
                contentPostId: task.contentPostId,
                approvalStatus: this.mapInternalReviewToApproval(task.internalReviewStatus, task.isBypassingInternalReview),
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
        const byAssetId = new Map(existingItems
            .filter((item) => item.sourceAssetId)
            .map((item) => [item.sourceAssetId, item.id]));
        const byUrl = new Map(existingItems.map((item) => [item.mediaUrl, item.id]));
        const keptItemIds = new Set();
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
            }
            else {
                const created = await this.prisma.deliverableItem.create({
                    data: {
                        deliverableId: deliverable.id,
                        status: client_1.DeliverableItemStatus.PENDING,
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
            throw new common_1.NotFoundException('Deliverable not found');
        }
        return record;
    }
    async findAllForClient(clientId, query = {}) {
        const where = {
            clientId,
        };
        if (query.status) {
            where.approvalStatus = (0, query_client_deliverables_dto_1.mapClientPortalDeliverableStatus)(query.status);
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
    async approveInternal(deliverableId, userId, role, note) {
        (0, rbac_1.assertCanPerformInternalApproval)(role);
        const deliverable = await this.requireDeliverableWithTask(deliverableId);
        await this.kanbanService.applyInternalApproval(deliverable.kanbanTaskId, userId, role, note);
        return this.getFullView(deliverable.id);
    }
    async requestInternalAdjustment(deliverableId, userId, role, note) {
        (0, rbac_1.assertCanPerformInternalApproval)(role);
        const deliverable = await this.requireDeliverableWithTask(deliverableId);
        await this.kanbanService.updateInternalReview(userId, role, deliverable.kanbanTaskId, {
            status: internal_review_dto_1.InternalReviewAction.REJECTED,
            note,
        });
        return this.getFullView(deliverable.id);
    }
    async submit(deliverableId, userId, role, file, caption) {
        const deliverable = await this.requireDeliverableWithTask(deliverableId);
        return this.kanbanService.uploadTaskAsset(userId, role, deliverable.kanbanTaskId, file, caption);
    }
    async rejectClient(deliverableId, dto, userId) {
        const deliverable = await this.requireDeliverableWithTask(deliverableId);
        await this.kanbanService.applyClientRejection(deliverable.kanbanTaskId, userId, dto.reason);
        return this.getFullView(deliverable.id);
    }
    async approveClient(deliverableId, userId) {
        const deliverable = await this.requireDeliverableWithTask(deliverableId);
        await this.kanbanService.applyClientApproval(deliverable.kanbanTaskId, userId);
        return this.getFullView(deliverable.id);
    }
    async markWaitingClientApproval(taskId) {
        const deliverable = await this.prisma.deliverable.findUnique({
            where: { kanbanTaskId: taskId },
            select: { id: true },
        });
        if (!deliverable)
            return;
        await this.prisma.deliverableItem.updateMany({
            where: { deliverableId: deliverable.id },
            data: {
                status: client_1.DeliverableItemStatus.PENDING,
                adjustmentNotes: null,
            },
        });
        await this.prisma.deliverable.update({
            where: { id: deliverable.id },
            data: {
                approvalStatus: client_1.DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL,
                approvedAt: null,
                approvedById: null,
            },
        });
    }
    async markRequiresAdjustment(taskId) {
        const deliverable = await this.prisma.deliverable.findUnique({
            where: { kanbanTaskId: taskId },
            select: { id: true },
        });
        if (!deliverable)
            return;
        await this.prisma.deliverable.update({
            where: { id: deliverable.id },
            data: {
                approvalStatus: client_1.DeliverableApprovalStatus.REQUIRES_ADJUSTMENT,
                approvedAt: null,
                approvedById: null,
            },
        });
    }
    async markClientApproved(taskId, approvedById) {
        const deliverable = await this.prisma.deliverable.findUnique({
            where: { kanbanTaskId: taskId },
            select: { id: true },
        });
        if (!deliverable)
            return;
        await this.prisma.deliverableItem.updateMany({
            where: { deliverableId: deliverable.id },
            data: { status: client_1.DeliverableItemStatus.APPROVED },
        });
        await this.prisma.deliverable.update({
            where: { id: deliverable.id },
            data: {
                approvalStatus: client_1.DeliverableApprovalStatus.APPROVED,
                approvedAt: new Date(),
                approvedById: approvedById ?? null,
            },
        });
    }
    async reviseItem(itemId, dto, actorUserId) {
        const item = await this.prisma.deliverableItem.findUnique({
            where: { id: itemId },
            include: { deliverable: true },
        });
        if (!item) {
            throw new common_1.NotFoundException('Deliverable item not found');
        }
        if (dto.status !== client_1.DeliverableItemStatus.APPROVED &&
            dto.status !== client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT &&
            dto.status !== client_1.DeliverableItemStatus.PENDING) {
            throw new common_1.BadRequestException('Invalid revision status');
        }
        const notes = dto.adjustmentNotes !== undefined
            ? dto.adjustmentNotes
            : dto.feedbackNotes;
        if (dto.status === client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT &&
            !notes?.trim()) {
            throw new common_1.BadRequestException('adjustmentNotes is required when marking media for adjustment');
        }
        const updated = await this.prisma.deliverableItem.update({
            where: { id: itemId },
            data: {
                status: dto.status,
                adjustmentNotes: notes !== undefined ? notes?.trim() || null : undefined,
            },
            select: itemSelect,
        });
        const nextStatus = await this.refreshDeliverableApproval(item.deliverableId);
        await this.syncKanbanFromApproval(item.deliverable.kanbanTaskId, nextStatus, actorUserId, notes);
        return this.toItemResponse(updated);
    }
    async getDownload(itemId) {
        const item = await this.prisma.deliverableItem.findUnique({
            where: { id: itemId },
            select: itemSelect,
        });
        if (!item) {
            throw new common_1.NotFoundException('Deliverable item not found');
        }
        const fileName = item.fileName || this.guessFileName(item.mediaUrl);
        const location = item.storageBucket && item.storagePath
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
                source: 'supabase',
            };
            return result;
        }
        if (item.mediaUrl.startsWith('/uploads/')) {
            const absolute = (0, path_1.join)(process.cwd(), item.mediaUrl.replace(/^\//, ''));
            if (!(0, fs_1.existsSync)(absolute)) {
                throw new common_1.NotFoundException('Media file not found on disk');
            }
            const result = {
                itemId: item.id,
                fileName,
                mediaType: item.mediaType.toLowerCase(),
                downloadUrl: item.mediaUrl,
                expiresAt: null,
                contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`,
                source: 'local',
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
                source: 'external',
            };
            return result;
        }
        throw new common_1.ServiceUnavailableException('Unable to generate a download URL for this media item');
    }
    async getFullView(deliverableId) {
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
            throw new common_1.NotFoundException('Deliverable not found');
        }
        const view = deliverable.kanbanTaskId != null
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
        const rejectionReason = await this.resolveRejectionReason(view.kanbanTaskId, view.contentPostId, task?.internalReviewNote ?? null);
        const items = view.items;
        const counts = {
            total: items.length,
            pending: items.filter((item) => item.status === client_1.DeliverableItemStatus.PENDING)
                .length,
            approved: items.filter((item) => item.status === client_1.DeliverableItemStatus.APPROVED).length,
            requiresAdjustment: items.filter((item) => item.status === client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT).length,
        };
        let copy = null;
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
                    .filter((item) => item.mediaType === client_1.DeliverableMediaType.IMAGE)
                    .map((item) => this.toItemResponse(item)),
                videos: items
                    .filter((item) => item.mediaType === client_1.DeliverableMediaType.VIDEO)
                    .map((item) => this.toItemResponse(item)),
                other: items
                    .filter((item) => item.mediaType === client_1.DeliverableMediaType.OTHER)
                    .map((item) => this.toItemResponse(item)),
                all: items.map((item) => this.toItemResponse(item)),
            },
            revisionSummary: counts,
            updatedAt: view.updatedAt.toISOString(),
            createdAt: view.createdAt.toISOString(),
        };
    }
    openLocalFileStream(absolutePath) {
        return (0, fs_1.createReadStream)(absolutePath);
    }
    resolveMonthDateRange(month, year) {
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
    toClientListResponse(deliverable) {
        const deliveryDate = deliverable.approvedAt ??
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
                pending: deliverable.items.filter((item) => item.status === client_1.DeliverableItemStatus.PENDING).length,
                approved: deliverable.items.filter((item) => item.status === client_1.DeliverableItemStatus.APPROVED).length,
                requiresAdjustment: deliverable.items.filter((item) => item.status === client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT).length,
            },
        };
    }
    async requireDeliverableWithTask(deliverableId) {
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
                throw new common_1.NotFoundException('Deliverable linked to a Kanban task was not found');
            }
            return {
                id: synced.id,
                kanbanTaskId: synced.kanbanTaskId,
                contentPostId: synced.contentPostId,
            };
        }
        return deliverable;
    }
    async refreshDeliverableApproval(deliverableId) {
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
        let approvalStatus = client_1.DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
        if (items.length === 0) {
            approvalStatus = client_1.DeliverableApprovalStatus.DRAFT;
        }
        else if (items.some((item) => item.status === client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT)) {
            approvalStatus = client_1.DeliverableApprovalStatus.REQUIRES_ADJUSTMENT;
        }
        else if (items.every((item) => item.status === client_1.DeliverableItemStatus.APPROVED)) {
            approvalStatus = client_1.DeliverableApprovalStatus.APPROVED;
        }
        else if (current?.approvalStatus === client_1.DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL ||
            current?.approvalStatus === client_1.DeliverableApprovalStatus.PENDING_APPROVAL) {
            approvalStatus = client_1.DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
        }
        else {
            approvalStatus = client_1.DeliverableApprovalStatus.PENDING_APPROVAL;
        }
        await this.prisma.deliverable.update({
            where: { id: deliverableId },
            data: {
                approvalStatus,
                approvedAt: approvalStatus === client_1.DeliverableApprovalStatus.APPROVED
                    ? new Date()
                    : null,
                approvedById: approvalStatus === client_1.DeliverableApprovalStatus.APPROVED
                    ? undefined
                    : null,
            },
        });
        return approvalStatus;
    }
    async syncKanbanFromApproval(kanbanTaskId, approvalStatus, actorUserId, reason) {
        if (!kanbanTaskId)
            return;
        if (approvalStatus === client_1.DeliverableApprovalStatus.REQUIRES_ADJUSTMENT) {
            const task = await this.prisma.kanbanTask.findFirst({
                where: { id: kanbanTaskId, deletedAt: null },
                select: {
                    status: true,
                    internalReviewStatus: true,
                },
            });
            if (!task)
                return;
            const isClientReviewPhase = task.status === client_1.KanbanTaskStatus.JHONATAN_APROVOU ||
                task.internalReviewStatus === client_1.InternalReviewStatus.APPROVED;
            if (isClientReviewPhase) {
                await this.kanbanService.applyClientRejection(kanbanTaskId, actorUserId, reason);
            }
            else {
                await this.kanbanService.applyInternalAdjustment(kanbanTaskId, actorUserId, reason);
            }
            return;
        }
        if (approvalStatus === client_1.DeliverableApprovalStatus.APPROVED) {
            await this.kanbanService.applyClientApproval(kanbanTaskId, actorUserId);
        }
    }
    async getDeliverableRecord(id) {
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
    async looksLikeTaskId(id) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id, deletedAt: null },
            select: { id: true },
        });
        return Boolean(task);
    }
    resolveStorageLocation(mediaUrl) {
        return this.storage.extractStorageLocation(mediaUrl);
    }
    resolveMediaType(mimeOrType) {
        const value = mimeOrType.toLowerCase();
        if (value.startsWith('image/'))
            return client_1.DeliverableMediaType.IMAGE;
        if (value.startsWith('video/'))
            return client_1.DeliverableMediaType.VIDEO;
        if (['image', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(value)) {
            return client_1.DeliverableMediaType.IMAGE;
        }
        if (['video', 'mp4', 'mov', 'quicktime'].includes(value)) {
            return client_1.DeliverableMediaType.VIDEO;
        }
        return client_1.DeliverableMediaType.OTHER;
    }
    mapInternalReviewToApproval(status, isBypassingInternalReview = false) {
        if (isBypassingInternalReview && status === 'APPROVED') {
            return client_1.DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
        }
        switch (status) {
            case 'APPROVED':
                return client_1.DeliverableApprovalStatus.WAITING_CLIENT_APPROVAL;
            case 'REJECTED':
                return client_1.DeliverableApprovalStatus.REQUIRES_ADJUSTMENT;
            case 'PENDING':
                return client_1.DeliverableApprovalStatus.PENDING_APPROVAL;
            default:
                return client_1.DeliverableApprovalStatus.DRAFT;
        }
    }
    async resolveRejectionReason(kanbanTaskId, contentPostId, kanbanNote) {
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
                    type: client_1.PostFeedbackType.REJECTION_REASON,
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
    guessFileName(mediaUrl) {
        try {
            const pathname = new URL(mediaUrl, 'http://localhost').pathname;
            const base = pathname.split('/').pop();
            return base && base.trim() ? base : 'download.bin';
        }
        catch {
            return 'download.bin';
        }
    }
    toItemResponse(item) {
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
};
exports.DeliverablesService = DeliverablesService;
exports.DeliverablesService = DeliverablesService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => kanban_service_1.KanbanService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_storage_service_1.SupabaseStorageService,
        kanban_service_1.KanbanService])
], DeliverablesService);
//# sourceMappingURL=deliverables.service.js.map