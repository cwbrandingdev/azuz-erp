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
const prisma_service_1 = require("../../prisma/prisma.service");
const instagram_graph_client_1 = require("../instagram-insights/infrastructure/instagram-graph.client");
const instagram_credentials_resolver_1 = require("../instagram-insights/infrastructure/instagram-credentials.resolver");
const meta_schedule_1 = require("./domain/meta-schedule");
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
    logger = new common_1.Logger(MetaPublishingService_1.name);
    constructor(prisma, graph, credentials) {
        this.prisma = prisma;
        this.graph = graph;
        this.credentials = credentials;
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
        const schedule = (0, meta_schedule_1.resolveMetaPublishAt)(publicationDate);
        if (schedule.error) {
            await this.markFailed(postId, schedule.error);
            return;
        }
        try {
            await this.runPublish({
                postId,
                post,
                taskAssets: context?.taskAssets ?? task?.assets ?? [],
                caption: context?.caption?.trim() ||
                    task?.postCaption?.trim() ||
                    post.copy?.trim() ||
                    '',
                clientId: context?.clientId ?? post.clientId ?? task?.clientId,
                publishAtUnix: schedule.publishAtUnix,
                scheduledDate: publicationDate,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Falha ao agendar no Instagram';
            this.logger.warn(`Meta schedule failed for post ${postId}: ${message}`);
            await this.markFailed(postId, message);
        }
    }
    async publishNowForContentPost(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            include: { attachments: true },
        });
        if (!post) {
            throw new common_1.BadRequestException('Post de conteúdo não encontrado');
        }
        if (post.platform !== client_1.ContentPlatform.INSTAGRAM) {
            throw new common_1.BadRequestException('Apenas posts Instagram podem ser publicados');
        }
        if (post.metaPublishStatus === client_1.MetaPublishStatus.PUBLISHED) {
            throw new common_1.BadRequestException('Este post já foi publicado no Instagram');
        }
        if (post.metaPublishStatus === client_1.MetaPublishStatus.SCHEDULED) {
            await this.cancelScheduleForContentPost(postId);
        }
        const task = await this.prisma.kanbanTask.findFirst({
            where: { contentPostId: postId, deletedAt: null },
            include: { assets: { orderBy: { uploadedAt: 'asc' } } },
        });
        const clientId = post.clientId ?? task?.clientId;
        if (!clientId) {
            throw new common_1.BadRequestException('Cliente não vinculado ao post');
        }
        const refreshed = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            include: { attachments: true },
        });
        if (!refreshed) {
            throw new common_1.BadRequestException('Post de conteúdo não encontrado');
        }
        try {
            return await this.runPublish({
                postId,
                post: refreshed,
                taskAssets: task?.assets ?? [],
                caption: task?.postCaption?.trim() || refreshed.copy?.trim() || '',
                clientId,
                publishAtUnix: null,
                scheduledDate: new Date(),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
            await this.markFailed(postId, message);
            throw new common_1.BadRequestException(message);
        }
    }
    async runPublish(input) {
        const { postId, post, taskAssets, caption, publishAtUnix, scheduledDate } = input;
        const clientId = input.clientId;
        if (!clientId) {
            throw new common_1.BadRequestException('Cliente não vinculado');
        }
        const media = this.resolveMediaItems(post.attachments, taskAssets);
        if (media.length === 0) {
            throw new common_1.BadRequestException('Nenhuma mídia compatível para publicar no Instagram');
        }
        if (post.format === client_1.ContentPostFormat.STORY) {
            throw new common_1.BadRequestException('Publicação de Stories via API não está disponível nesta versão');
        }
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.PENDING,
                metaPublishError: null,
                scheduledDate,
            },
        });
        const creds = await this.credentials.resolveForClient(clientId);
        const creationId = await this.createMediaContainer(creds.instagramUserId, creds.accessToken, post.format, media, caption);
        await this.waitForContainerIfNeeded(creationId, creds.accessToken);
        const published = await this.graph.publishMediaContainer(creds.instagramUserId, creds.accessToken, {
            creationId,
            publishAtUnix,
        });
        let permalink = null;
        try {
            const mediaInfo = await this.graph.getMediaPermalink(published.id, creds.accessToken);
            permalink = mediaInfo.permalink ?? null;
        }
        catch {
            permalink = null;
        }
        const isScheduled = publishAtUnix != null;
        const updated = await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaIgContainerId: creationId,
                metaIgMediaId: published.id,
                metaPublishStatus: isScheduled
                    ? client_1.MetaPublishStatus.SCHEDULED
                    : client_1.MetaPublishStatus.PUBLISHED,
                metaPublishError: null,
                metaScheduledAt: isScheduled ? scheduledDate : null,
                metaIgPermalink: permalink,
                scheduledDate,
                status: isScheduled
                    ? client_1.ContentPostStatus.SCHEDULED
                    : client_1.ContentPostStatus.PUBLISHED,
            },
        });
        return {
            postId,
            metaPublishStatus: updated.metaPublishStatus,
            metaIgPermalink: updated.metaIgPermalink,
            metaPublishError: null,
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
        if (post.metaIgMediaId && post.metaPublishStatus === client_1.MetaPublishStatus.SCHEDULED) {
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
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.FAILED,
                metaPublishError: message,
            },
        });
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
        instagram_credentials_resolver_1.InstagramCredentialsResolver])
], MetaPublishingService);
//# sourceMappingURL=meta-publishing.service.js.map