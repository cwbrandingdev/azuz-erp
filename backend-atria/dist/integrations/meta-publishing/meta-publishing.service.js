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
var MetaPublishingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaPublishingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const kanban_content_type_1 = require("../../kanban/kanban-content-type");
const notifications_service_1 = require("../../notifications/notifications.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const instagram_credentials_resolver_1 = require("../instagram-insights/infrastructure/instagram-credentials.resolver");
const instagram_graph_client_1 = require("../instagram-insights/infrastructure/instagram-graph.client");
const meta_publish_readiness_1 = require("./domain/meta-publish-readiness");
const meta_schedule_1 = require("./domain/meta-schedule");
const meta_publishing_sync_service_1 = require("./meta-publishing.sync.service");
const IMAGE_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime']);
let MetaPublishingService = MetaPublishingService_1 = class MetaPublishingService {
    prisma;
    graph;
    credentials;
    sync;
    notifications;
    logger = new common_1.Logger(MetaPublishingService_1.name);
    constructor(prisma, graph, credentials, sync, notifications) {
        this.prisma = prisma;
        this.graph = graph;
        this.credentials = credentials;
        this.sync = sync;
        this.notifications = notifications;
    }
    async tryScheduleForTask(taskId) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: {
                assets: { orderBy: { uploadedAt: 'asc' } },
                contentPost: { include: { attachments: true } },
            },
        });
        if (!task?.contentPostId || !task.contentPost) {
            return;
        }
        await this.tryScheduleForContentPost(task.contentPostId, {
            publicationDate: task.publicationDate,
            caption: this.resolveCaption(task),
            taskAssets: task.assets,
            post: task.contentPost,
            clientId: task.clientId,
        });
    }
    async tryScheduleForContentPost(postId, context) {
        const post = context?.post ??
            (await this.prisma.contentPost.findUnique({
                where: { id: postId },
                include: { attachments: true },
            }));
        if (!post) {
            return;
        }
        if (post.platform !== client_1.ContentPlatform.INSTAGRAM) {
            return;
        }
        if (post.status !== client_1.ContentPostStatus.APPROVED) {
            return;
        }
        if (post.metaPublishStatus === client_1.MetaPublishStatus.SCHEDULED ||
            post.metaPublishStatus === client_1.MetaPublishStatus.PUBLISHED) {
            return;
        }
        const task = await this.prisma.kanbanTask.findFirst({
            where: { contentPostId: postId, deletedAt: null },
            include: { assets: { orderBy: { uploadedAt: 'asc' } } },
        });
        const publicationDate = context?.publicationDate ??
            task?.publicationDate ??
            post.scheduledDate;
        if (!publicationDate) {
            return;
        }
        const clientId = context?.clientId ?? post.clientId ?? task?.clientId;
        if (!clientId) {
            return;
        }
        const caption = context?.caption?.trim() ||
            task?.postCaption?.trim() ||
            post.copy?.trim() ||
            '';
        const media = this.resolveMediaItems(post.attachments, context?.taskAssets ?? task?.assets ?? []);
        if (media.length === 0) {
            await this.markFailed(postId, 'Nenhuma mídia compatível para publicar no Instagram');
            return;
        }
        const isStory = post.format === client_1.ContentPostFormat.STORY;
        const schedule = (0, meta_schedule_1.resolveMetaPublishAt)(publicationDate);
        if (isStory && schedule.publishAtUnix != null) {
            await this.markFailed(postId, 'Stories não podem ser agendados no Instagram. Use uma data no passado/imediata ou o botão Publicar agora.');
            return;
        }
        if (!isStory && schedule.error) {
            await this.markFailed(postId, schedule.error);
            return;
        }
        const publishAtUnix = isStory ? null : schedule.publishAtUnix;
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.PENDING,
                metaPublishError: null,
                scheduledDate: publicationDate,
            },
        });
        try {
            await this.runPublish({
                postId,
                clientId,
                format: post.format,
                media,
                caption,
                publicationDate,
                publishAtUnix,
            });
        }
        catch (error) {
            const raw = error instanceof Error ? error.message : 'Falha ao agendar no Instagram';
            this.logger.warn(`Meta schedule failed for post ${postId}: ${raw}`);
            await this.markFailed(postId, raw);
        }
    }
    async publishNowForContentPost(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            include: { attachments: true },
        });
        if (!post) {
            throw new common_1.BadRequestException('Post não encontrado');
        }
        if (post.platform !== client_1.ContentPlatform.INSTAGRAM) {
            throw new common_1.BadRequestException('Apenas posts Instagram podem ser publicados');
        }
        if (!post.clientId) {
            throw new common_1.BadRequestException('Cliente não vinculado ao post');
        }
        const task = await this.prisma.kanbanTask.findFirst({
            where: { contentPostId: postId, deletedAt: null },
            include: { assets: { orderBy: { uploadedAt: 'asc' } } },
        });
        const media = this.resolveMediaItems(post.attachments, task?.assets ?? []);
        if (media.length === 0) {
            throw new common_1.BadRequestException('Nenhuma mídia compatível para publicar no Instagram');
        }
        const caption = task?.postCaption?.trim() || post.copy?.trim() || '';
        if (post.metaPublishStatus === client_1.MetaPublishStatus.SCHEDULED ||
            post.metaPublishStatus === client_1.MetaPublishStatus.PENDING) {
            await this.cancelScheduleForContentPost(postId);
        }
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.PENDING,
                metaPublishError: null,
            },
        });
        try {
            await this.runPublish({
                postId,
                clientId: post.clientId,
                format: post.format,
                media,
                caption,
                publicationDate: new Date(),
                publishAtUnix: null,
            });
        }
        catch (error) {
            const raw = error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
            const message = (0, meta_publish_readiness_1.humanizeMetaPublishError)(raw);
            await this.markFailed(postId, raw);
            throw new common_1.BadRequestException(message);
        }
        const updated = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            select: {
                id: true,
                metaPublishStatus: true,
                metaIgPermalink: true,
                metaPublishError: true,
            },
        });
        return {
            postId,
            metaPublishStatus: updated?.metaPublishStatus ?? client_1.MetaPublishStatus.FAILED,
            metaIgPermalink: updated?.metaIgPermalink ?? null,
            metaPublishError: updated?.metaPublishError ?? null,
        };
    }
    async handlePublicationDateChange(taskId) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id: taskId, deletedAt: null },
            select: { id: true, contentPostId: true, publicationDate: true },
        });
        if (!task?.contentPostId) {
            return;
        }
        const post = await this.prisma.contentPost.findUnique({
            where: { id: task.contentPostId },
            select: { metaPublishStatus: true, status: true },
        });
        if (!post) {
            return;
        }
        if (task.publicationDate) {
            await this.prisma.contentPost.update({
                where: { id: task.contentPostId },
                data: { scheduledDate: task.publicationDate },
            });
        }
        if (post.metaPublishStatus === client_1.MetaPublishStatus.SCHEDULED ||
            post.metaPublishStatus === client_1.MetaPublishStatus.FAILED) {
            await this.cancelScheduleForContentPost(task.contentPostId);
            if (post.status === client_1.ContentPostStatus.APPROVED) {
                await this.tryScheduleForTask(taskId);
            }
        }
    }
    async cancelScheduleForContentPost(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            select: {
                id: true,
                clientId: true,
                metaIgMediaId: true,
                metaPublishStatus: true,
            },
        });
        if (!post) {
            return;
        }
        if (post.metaPublishStatus !== client_1.MetaPublishStatus.SCHEDULED &&
            post.metaPublishStatus !== client_1.MetaPublishStatus.FAILED &&
            post.metaPublishStatus !== client_1.MetaPublishStatus.PENDING) {
            return;
        }
        if (post.metaIgMediaId &&
            post.metaPublishStatus === client_1.MetaPublishStatus.SCHEDULED &&
            post.clientId) {
            try {
                const creds = await this.credentials.resolveForClient(post.clientId);
                await this.graph.deleteMedia(post.metaIgMediaId, creds.accessToken);
            }
            catch (error) {
                this.logger.warn(`Could not delete Meta media ${post.metaIgMediaId}: ${String(error)}`);
            }
        }
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaIgContainerId: null,
                metaIgMediaId: null,
                metaPublishStatus: client_1.MetaPublishStatus.NOT_SCHEDULED,
                metaPublishError: null,
                metaScheduledAt: null,
                metaIgPermalink: null,
            },
        });
    }
    async runPublish(input) {
        const creds = await this.credentials.resolveForClient(input.clientId);
        const creationId = await this.createMediaContainer(creds.instagramUserId, creds.accessToken, input.format, input.media, input.caption);
        await this.waitForContainerIfNeeded(creationId, creds.accessToken);
        const published = await this.graph.publishMediaContainer(creds.instagramUserId, creds.accessToken, {
            creationId,
            publishAtUnix: input.publishAtUnix,
        });
        let permalink = null;
        try {
            const mediaInfo = await this.graph.getMediaPermalink(published.id, creds.accessToken);
            permalink = mediaInfo.permalink ?? null;
        }
        catch {
            permalink = null;
        }
        const scheduled = input.publishAtUnix != null;
        await this.prisma.contentPost.update({
            where: { id: input.postId },
            data: {
                metaIgContainerId: creationId,
                metaIgMediaId: published.id,
                metaPublishStatus: scheduled
                    ? client_1.MetaPublishStatus.SCHEDULED
                    : client_1.MetaPublishStatus.PUBLISHED,
                metaPublishError: null,
                metaScheduledAt: scheduled ? input.publicationDate : null,
                metaPublishedAt: scheduled ? null : new Date(),
                metaIgPermalink: permalink,
                scheduledDate: input.publicationDate,
                status: scheduled
                    ? client_1.ContentPostStatus.SCHEDULED
                    : client_1.ContentPostStatus.PUBLISHED,
            },
        });
        if (!scheduled) {
            await this.notifyAssigneesForPost(input.postId, true);
        }
    }
    async getTaskPublishReadiness(taskId) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: {
                assets: { orderBy: { uploadedAt: 'asc' } },
                contentPost: { include: { attachments: true } },
                client: {
                    select: {
                        id: true,
                        instagramUserId: true,
                        metaAccessToken: true,
                    },
                },
            },
        });
        if (!task) {
            throw new common_1.BadRequestException('Task not found');
        }
        const format = task.contentPost
            ? task.contentPost.format
            : (0, kanban_content_type_1.contentTypeToPostFormat)(task.contentType);
        const media = this.resolveMediaItems(task.contentPost?.attachments ?? [], task.assets);
        const images = media.filter((m) => this.isImage(m.mimeType, m.url));
        const videos = media.filter((m) => this.isVideo(m.mimeType, m.url));
        let clientHasInstagram = Boolean(task.client?.instagramUserId?.trim());
        let clientHasMetaToken = Boolean(task.client?.metaAccessToken);
        if (task.clientId) {
            try {
                await this.credentials.resolveForClient(task.clientId);
                clientHasInstagram = true;
                clientHasMetaToken = true;
            }
            catch {
                if (!task.client?.instagramUserId?.trim()) {
                    clientHasInstagram = false;
                }
                if (!task.client?.metaAccessToken) {
                    clientHasMetaToken = false;
                }
            }
        }
        const firstUrl = media[0]?.url;
        const mediaUrlReachable = firstUrl && firstUrl.toLowerCase().startsWith('https://')
            ? await this.probePublicMediaUrl(firstUrl)
            : null;
        return (0, meta_publish_readiness_1.evaluateTaskPublishReadiness)({
            clientId: task.clientId,
            clientHasInstagram,
            clientHasMetaToken,
            publicationDate: task.publicationDate,
            format,
            media,
            imageCount: images.length,
            videoCount: videos.length,
            mediaUrlReachable,
        });
    }
    async retryPublishForTask(taskId) {
        const readiness = await this.getTaskPublishReadiness(taskId);
        if (!readiness.ready) {
            const first = readiness.blockers[0]?.message ?? 'Publicação não está pronta';
            throw new common_1.BadRequestException(first);
        }
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id: taskId, deletedAt: null },
            select: { contentPostId: true, status: true },
        });
        if (!task?.contentPostId) {
            throw new common_1.BadRequestException('Tarefa sem post de conteúdo vinculado');
        }
        await this.cancelScheduleForContentPost(task.contentPostId);
        await this.prisma.contentPost.update({
            where: { id: task.contentPostId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.NOT_SCHEDULED,
                metaPublishError: null,
            },
        });
        await this.tryScheduleForTask(taskId);
    }
    async refreshPublishStatusForTask(taskId) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { id: taskId, deletedAt: null },
            select: { contentPostId: true },
        });
        if (!task?.contentPostId) {
            return false;
        }
        const post = await this.prisma.contentPost.findUnique({
            where: { id: task.contentPostId },
            select: { metaPublishStatus: true },
        });
        if (post?.metaPublishStatus !== client_1.MetaPublishStatus.SCHEDULED) {
            return post?.metaPublishStatus === client_1.MetaPublishStatus.PUBLISHED;
        }
        return this.sync.syncPostByContentPostId(task.contentPostId);
    }
    resolveCaption(task) {
        return task.postCaption?.trim() || task.contentPost?.copy?.trim() || '';
    }
    resolveMediaItems(attachments, assets) {
        const fromAttachments = attachments
            .map((item) => ({
            url: item.url,
            mimeType: item.mimeType ?? '',
        }))
            .filter((item) => this.isSupportedMime(item.mimeType, item.url));
        if (fromAttachments.length > 0) {
            return fromAttachments;
        }
        return assets
            .map((item) => ({
            url: item.fileUrl,
            mimeType: item.fileType,
        }))
            .filter((item) => this.isSupportedMime(item.mimeType, item.url));
    }
    isSupportedMime(mimeType, url) {
        const normalized = mimeType.toLowerCase();
        if (IMAGE_MIME.has(normalized) || VIDEO_MIME.has(normalized)) {
            return true;
        }
        const lower = url.toLowerCase();
        return (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(lower) ||
            /\.(mp4|mov)(\?|$)/i.test(lower));
    }
    async createMediaContainer(igUserId, accessToken, format, media, caption) {
        const images = media.filter((item) => this.isImage(item.mimeType, item.url));
        const videos = media.filter((item) => this.isVideo(item.mimeType, item.url));
        if (format === client_1.ContentPostFormat.STORY) {
            if (videos.length > 0) {
                const created = await this.graph.createStoryMediaContainer(igUserId, accessToken, { videoUrl: videos[0].url });
                return created.id;
            }
            if (images.length === 0) {
                throw new Error('Story requer imagem ou vídeo');
            }
            const created = await this.graph.createStoryMediaContainer(igUserId, accessToken, { imageUrl: images[0].url });
            return created.id;
        }
        if (format === client_1.ContentPostFormat.CAROUSEL && images.length >= 2) {
            const childIds = [];
            for (const image of images) {
                const child = await this.graph.createImageMediaContainer(igUserId, accessToken, { imageUrl: image.url, isCarouselItem: true });
                childIds.push(child.id);
            }
            const parent = await this.graph.createCarouselMediaContainer(igUserId, accessToken, { children: childIds, caption });
            return parent.id;
        }
        if (format === client_1.ContentPostFormat.REELS && videos.length > 0) {
            const created = await this.graph.createVideoMediaContainer(igUserId, accessToken, {
                videoUrl: videos[0].url,
                caption,
                mediaType: 'REELS',
            });
            return created.id;
        }
        if (videos.length > 0) {
            const created = await this.graph.createVideoMediaContainer(igUserId, accessToken, {
                videoUrl: videos[0].url,
                caption,
                mediaType: 'VIDEO',
            });
            return created.id;
        }
        if (images.length === 0) {
            throw new Error('Nenhuma imagem ou vídeo válido para publicação');
        }
        const created = await this.graph.createImageMediaContainer(igUserId, accessToken, { imageUrl: images[0].url, caption });
        return created.id;
    }
    isImage(mimeType, url) {
        if (IMAGE_MIME.has(mimeType.toLowerCase())) {
            return true;
        }
        return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
    }
    isVideo(mimeType, url) {
        if (VIDEO_MIME.has(mimeType.toLowerCase())) {
            return true;
        }
        return /\.(mp4|mov)(\?|$)/i.test(url);
    }
    async waitForContainerIfNeeded(containerId, accessToken) {
        for (let attempt = 0; attempt < 24; attempt += 1) {
            const status = await this.graph.getMediaContainerStatus(containerId, accessToken);
            if (status.status_code === 'FINISHED' || !status.status_code) {
                return;
            }
            if (status.status_code === 'ERROR') {
                throw new Error('O Meta não conseguiu processar a mídia');
            }
            await this.sleep(2_500);
        }
        throw new Error('Tempo esgotado aguardando processamento da mídia no Meta');
    }
    async markFailed(postId, message) {
        const friendly = (0, meta_publish_readiness_1.humanizeMetaPublishError)(message);
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.FAILED,
                metaPublishError: friendly,
            },
        });
        await this.notifyAssigneesForPost(postId, false, friendly);
    }
    async notifyAssigneesForPost(postId, published, detail) {
        const task = await this.prisma.kanbanTask.findFirst({
            where: { contentPostId: postId, deletedAt: null },
            select: { id: true, title: true, companyId: true },
        });
        if (!task) {
            return;
        }
        await this.notifications.notifyMetaInstagramPublish({
            companyId: task.companyId,
            taskId: task.id,
            taskTitle: task.title,
            published,
            detail,
        });
    }
    async probePublicMediaUrl(url) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5_000);
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                redirect: 'follow',
            });
            clearTimeout(timeout);
            if (response.ok) {
                return true;
            }
            if (response.status === 405 || response.status === 403) {
                const getResponse = await fetch(url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5_000),
                    headers: { Range: 'bytes=0-0' },
                });
                return getResponse.ok;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.MetaPublishingService = MetaPublishingService;
exports.MetaPublishingService = MetaPublishingService = MetaPublishingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        instagram_graph_client_1.InstagramGraphClient,
        instagram_credentials_resolver_1.InstagramCredentialsResolver,
        meta_publishing_sync_service_1.MetaPublishingSyncService,
        notifications_service_1.NotificationsService])
], MetaPublishingService);
//# sourceMappingURL=meta-publishing.service.js.map