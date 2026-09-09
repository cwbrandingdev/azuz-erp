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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const integrations_service_1 = require("../integrations/integrations.service");
const kanban_service_1 = require("../kanban/kanban.service");
const meta_insights_service_1 = require("../meta-insights/meta-insights.service");
const calendar_service_1 = require("../calendar/calendar.service");
const permissions_1 = require("../auth/constants/permissions");
const rbac_1 = require("../auth/utils/rbac");
const prisma_service_1 = require("../prisma/prisma.service");
const internal_review_dto_1 = require("../kanban/dto/internal-review.dto");
const PLATFORM_COLORS = {
    INSTAGRAM: '#E1306C',
    TIKTOK: '#000000',
    YOUTUBE: '#FF0000',
    LINKEDIN: '#0A66C2',
};
const userSelect = { id: true, name: true, avatarUrl: true };
const clientSelect = {
    id: true,
    companyName: true,
    avatarUrl: true,
    instagram: true,
};
const postInclude = {
    attachments: true,
    user: { select: userSelect },
    assignee: { select: userSelect },
    client: { select: clientSelect },
};
let ContentService = class ContentService {
    prisma;
    notifications;
    integrations;
    metaInsights;
    calendar;
    kanbanService;
    constructor(prisma, notifications, integrations, metaInsights, calendar, kanbanService) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.integrations = integrations;
        this.metaInsights = metaInsights;
        this.calendar = calendar;
        this.kanbanService = kanbanService;
    }
    async getManagementBoard(clientId, status) {
        const where = {};
        if (clientId)
            where.clientId = clientId;
        if (status)
            where.status = status;
        const feedbackInclude = {
            orderBy: { createdAt: 'desc' },
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
    async getOverview(clientId) {
        const where = clientId ? { clientId } : {};
        const [drafts, pendingApproval, scheduled, published, total] = await Promise.all([
            this.prisma.contentPost.count({
                where: { ...where, status: client_1.ContentPostStatus.DRAFT },
            }),
            this.prisma.contentPost.count({
                where: { ...where, status: client_1.ContentPostStatus.PENDING_APPROVAL },
            }),
            this.prisma.contentPost.count({
                where: { ...where, status: client_1.ContentPostStatus.SCHEDULED },
            }),
            this.prisma.contentPost.count({
                where: { ...where, status: client_1.ContentPostStatus.PUBLISHED },
            }),
            this.prisma.contentPost.count({ where }),
        ]);
        return { drafts, pendingApproval, scheduled, published, total };
    }
    async getCalendarOverview(from, to, clientId) {
        const where = {
            scheduledDate: { not: null },
            status: {
                in: [
                    client_1.ContentPostStatus.SCHEDULED,
                    client_1.ContentPostStatus.PUBLISHED,
                    client_1.ContentPostStatus.PENDING_APPROVAL,
                ],
            },
        };
        if (clientId)
            where.clientId = clientId;
        if (from || to) {
            where.scheduledDate = {};
            if (from)
                where.scheduledDate.gte = new Date(from);
            if (to)
                where.scheduledDate.lte = new Date(to);
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
            scheduledDate: post.scheduledDate.toISOString(),
            status: post.status.toLowerCase(),
            clientName: post.client.companyName,
            color: PLATFORM_COLORS[post.platform] ?? '#004949',
        }));
    }
    async getPosts(query) {
        const where = {};
        if (query.clientId)
            where.clientId = query.clientId;
        if (query.platform)
            where.platform = query.platform;
        if (query.status)
            where.status = query.status;
        if (query.from || query.to) {
            where.scheduledDate = {};
            if (query.from)
                where.scheduledDate.gte = new Date(query.from);
            if (query.to)
                where.scheduledDate.lte = new Date(query.to);
        }
        const posts = await this.prisma.contentPost.findMany({
            where,
            include: postInclude,
            orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
        });
        return posts.map((post) => this.toPostResponse(post));
    }
    async getPostById(id) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id },
            include: postInclude,
        });
        if (!post)
            throw new common_1.NotFoundException('Content post not found');
        return this.toPostResponse(post);
    }
    async createVersion(postId, userId, dto) {
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
    async approvePost(id) {
        const existing = await this.ensurePostExists(id);
        if (existing.internalReviewStatus !== client_1.InternalReviewStatus.APPROVED) {
            throw new common_1.BadRequestException('Aprovação interna necessária antes de aprovar para o cliente');
        }
        const post = await this.prisma.contentPost.update({
            where: { id },
            data: { status: client_1.ContentPostStatus.APPROVED },
            include: postInclude,
        });
        return this.toPostResponse(post);
    }
    async updateInternalReview(id, userId, role, dto) {
        const existing = await this.ensurePostExists(id);
        const status = this.mapInternalReviewAction(dto.status);
        if (status === client_1.InternalReviewStatus.REJECTED && !dto.note?.trim()) {
            throw new common_1.BadRequestException('Motivo da rejeição é obrigatório para revisão interna');
        }
        if (status === client_1.InternalReviewStatus.APPROVED ||
            status === client_1.InternalReviewStatus.REJECTED) {
            (0, rbac_1.assertCanPerformInternalApproval)(role);
        }
        if (status === client_1.InternalReviewStatus.APPROVED) {
            const hasDeliverables = await this.postHasDeliverables(id);
            if (!hasDeliverables) {
                throw new common_1.BadRequestException('É necessário anexar pelo menos uma entrega antes da aprovação interna');
            }
            if (existing.internalReviewStatus !== client_1.InternalReviewStatus.PENDING) {
                throw new common_1.BadRequestException('O conteúdo precisa estar em revisão interna pendente antes da aprovação');
            }
        }
        const post = await this.prisma.contentPost.update({
            where: { id },
            data: {
                internalReviewStatus: status,
                internalReviewNote: dto.note?.trim() ?? null,
                ...(status === client_1.InternalReviewStatus.APPROVED &&
                    existing.status !== client_1.ContentPostStatus.PENDING_APPROVAL
                    ? { status: client_1.ContentPostStatus.PENDING_APPROVAL }
                    : {}),
            },
            include: postInclude,
        });
        if (status === client_1.InternalReviewStatus.APPROVED &&
            post.status === client_1.ContentPostStatus.PENDING_APPROVAL) {
            await this.notifyPostPending(post);
        }
        return this.toPostResponse(post);
    }
    async rejectPost(id, userId, dto) {
        await this.ensurePostExists(id);
        const latestVersion = await this.prisma.postVersion.findFirst({
            where: { postId: id },
            orderBy: { versionNumber: 'desc' },
            select: { id: true },
        });
        const [post] = await this.prisma.$transaction([
            this.prisma.contentPost.update({
                where: { id },
                data: { status: client_1.ContentPostStatus.REJECTED },
                include: postInclude,
            }),
            this.prisma.postFeedback.create({
                data: {
                    postId: id,
                    versionId: latestVersion?.id,
                    userId,
                    comment: dto.rejectionReason,
                    type: client_1.PostFeedbackType.REJECTION_REASON,
                },
            }),
        ]);
        const recipients = [post.assigneeId, post.userId].filter((uid) => Boolean(uid));
        await this.notifications.notifyPostRejected(recipients, post.title, post.client.companyName, dto.rejectionReason);
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
    async getPostInsights(postId) {
        const post = await this.ensurePostExists(postId);
        return this.metaInsights.getPostInsights(postId, post.clientId);
    }
    async getPostHistory(postId) {
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
                kind: 'version',
                id: version.id,
                createdAt: version.createdAt.toISOString(),
                data: this.toVersionResponse(version),
            })),
            ...feedback.map((entry) => ({
                kind: 'feedback',
                id: entry.id,
                createdAt: entry.createdAt.toISOString(),
                data: this.toFeedbackResponse(entry),
            })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return {
            versions: versions.map((version) => this.toVersionResponse(version)),
            feedback: feedback.map((entry) => this.toFeedbackResponse(entry)),
            timeline,
        };
    }
    async createPost(userId, dto) {
        await this.ensureClientExists(dto.clientId);
        if (dto.assigneeId)
            await this.ensureUserExists(dto.assigneeId);
        const status = dto.status ?? client_1.ContentPostStatus.DRAFT;
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
        if (status === client_1.ContentPostStatus.PENDING_APPROVAL) {
            await this.notifyPostPending(post);
        }
        await this.calendar.syncEventFromPost(post, userId);
        return this.toPostResponse(post);
    }
    async updatePost(id, dto) {
        const existing = await this.ensurePostExists(id);
        if (dto.clientId)
            await this.ensureClientExists(dto.clientId);
        if (dto.assigneeId)
            await this.ensureUserExists(dto.assigneeId);
        if (dto.status) {
            if (dto.status === client_1.ContentPostStatus.APPROVED ||
                dto.status === client_1.ContentPostStatus.REJECTED ||
                dto.status === client_1.ContentPostStatus.PENDING_APPROVAL) {
                throw new common_1.BadRequestException('Use o fluxo de aprovação interna e do cliente para alterar este status');
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
                scheduledDate: dto.scheduledDate !== undefined
                    ? dto.scheduledDate
                        ? new Date(dto.scheduledDate)
                        : null
                    : undefined,
                status: dto.status,
                copy: dto.copy,
                referenceUrl: dto.referenceUrl !== undefined ? dto.referenceUrl : undefined,
                assigneeId: dto.assigneeId !== undefined ? dto.assigneeId : undefined,
                attachments: dto.attachments?.length
                    ? { create: dto.attachments }
                    : undefined,
            },
            include: postInclude,
        });
        await this.calendar.syncEventFromPost(post, post.userId);
        return this.toPostResponse(post);
    }
    async notifyPostPending(post) {
        const recipients = [];
        if (post.assigneeId)
            recipients.push(post.assigneeId);
        if (post.userId)
            recipients.push(post.userId);
        await this.notifications.notifyPostPending(recipients, post.title, post.client.companyName);
    }
    async deletePost(id) {
        await this.ensurePostExists(id);
        await this.prisma.contentPost.delete({ where: { id } });
    }
    async ensureClientExists(id) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        return client;
    }
    async ensureUserExists(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if ((0, permissions_1.isClientFacingRole)(user.role.name)) {
            throw new common_1.BadRequestException('Usuários com perfil de cliente não podem ser responsáveis por conteúdo');
        }
        return user;
    }
    async postHasDeliverables(postId) {
        const attachmentCount = await this.prisma.contentAttachment.count({
            where: { postId },
        });
        if (attachmentCount > 0)
            return true;
        const task = await this.prisma.kanbanTask.findFirst({
            where: { contentPostId: postId },
            select: { id: true },
        });
        if (!task)
            return false;
        const assetCount = await this.prisma.kanbanTaskAsset.count({
            where: { taskId: task.id },
        });
        return assetCount > 0;
    }
    async ensurePostExists(id) {
        const post = await this.prisma.contentPost.findUnique({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException('Content post not found');
        return post;
    }
    toPostResponse(post) {
        return {
            id: post.id,
            title: post.title,
            clientId: post.clientId,
            client: post.client,
            platform: post.platform.toLowerCase(),
            format: post.format.toLowerCase(),
            scheduledDate: post.scheduledDate?.toISOString() ?? null,
            status: post.status.toLowerCase(),
            internalReviewStatus: post.internalReviewStatus.toLowerCase(),
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
    toVersionResponse(version) {
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
    toFeedbackResponse(entry) {
        return {
            id: entry.id,
            postId: entry.postId,
            versionId: entry.versionId,
            versionLabel: entry.version
                ? this.formatVersionLabel(entry.version.versionNumber)
                : null,
            comment: entry.comment,
            type: entry.type.toLowerCase(),
            user: entry.user,
            createdAt: entry.createdAt.toISOString(),
        };
    }
    formatVersionLabel(versionNumber) {
        const major = Math.floor((versionNumber - 1) / 10) + 1;
        const minor = (versionNumber - 1) % 10;
        return `v${major}.${minor}`;
    }
    mapInternalReviewAction(action) {
        switch (action) {
            case internal_review_dto_1.InternalReviewAction.PENDING:
                return client_1.InternalReviewStatus.PENDING;
            case internal_review_dto_1.InternalReviewAction.APPROVED:
                return client_1.InternalReviewStatus.APPROVED;
            case internal_review_dto_1.InternalReviewAction.REJECTED:
                return client_1.InternalReviewStatus.REJECTED;
            default:
                return client_1.InternalReviewStatus.NOT_REQUIRED;
        }
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        integrations_service_1.IntegrationsService,
        meta_insights_service_1.MetaInsightsService,
        calendar_service_1.CalendarService,
        kanban_service_1.KanbanService])
], ContentService);
//# sourceMappingURL=content.service.js.map