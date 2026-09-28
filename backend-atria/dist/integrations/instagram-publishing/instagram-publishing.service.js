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
var InstagramPublishingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramPublishingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const instagram_credentials_resolver_1 = require("../instagram-insights/infrastructure/instagram-credentials.resolver");
const instagram_graph_client_1 = require("../instagram-insights/infrastructure/instagram-graph.client");
const instagram_publish_media_resolver_1 = require("./instagram-publish-media.resolver");
const MAX_PUBLISH_ATTEMPTS = 3;
const CONTAINER_POLL_ATTEMPTS = 12;
const CONTAINER_POLL_MS = 2_500;
function agentDebug(location, message, data, hypothesisId) {
    fetch('http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': 'ff56e0',
        },
        body: JSON.stringify({
            sessionId: 'ff56e0',
            location,
            message,
            data,
            hypothesisId,
            timestamp: Date.now(),
            runId: 'post-fix',
        }),
    }).catch(() => { });
}
const postInclude = {
    attachments: { orderBy: { createdAt: 'asc' } },
    client: {
        select: {
            id: true,
            companyName: true,
            instagram: true,
            instagramUserId: true,
        },
    },
};
let InstagramPublishingService = InstagramPublishingService_1 = class InstagramPublishingService {
    prisma;
    credentials;
    graph;
    mediaResolver;
    logger = new common_1.Logger(InstagramPublishingService_1.name);
    constructor(prisma, credentials, graph, mediaResolver) {
        this.prisma = prisma;
        this.credentials = credentials;
        this.graph = graph;
        this.mediaResolver = mediaResolver;
    }
    async syncPublishQueue(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            include: { attachments: true },
        });
        if (!post) {
            return;
        }
        const shouldQueue = this.shouldQueueForPublish(post);
        if (!shouldQueue) {
            if (post.publishStatus === client_1.ContentPostPublishStatus.QUEUED &&
                !post.publishToInstagram) {
                await this.prisma.contentPost.update({
                    where: { id: postId },
                    data: {
                        publishStatus: client_1.ContentPostPublishStatus.NONE,
                        publishError: null,
                    },
                });
            }
            return;
        }
        if (post.publishStatus === client_1.ContentPostPublishStatus.PUBLISHED) {
            return;
        }
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                publishStatus: client_1.ContentPostPublishStatus.QUEUED,
                publishError: null,
            },
        });
    }
    async publishNow(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            include: postInclude,
        });
        if (!post) {
            throw new common_1.NotFoundException('Content post not found');
        }
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                publishToInstagram: true,
                scheduledDate: new Date(),
                publishStatus: client_1.ContentPostPublishStatus.QUEUED,
                publishError: null,
            },
        });
        await this.publishDuePost(postId);
    }
    async processDuePosts(limit = 10) {
        const now = new Date();
        const due = await this.prisma.contentPost.findMany({
            where: {
                publishToInstagram: true,
                publishStatus: client_1.ContentPostPublishStatus.QUEUED,
                platform: client_1.ContentPlatform.INSTAGRAM,
                scheduledDate: { lte: now },
                publishAttempts: { lt: MAX_PUBLISH_ATTEMPTS },
            },
            orderBy: { scheduledDate: 'asc' },
            take: limit,
            select: { id: true },
        });
        for (const row of due) {
            try {
                await this.publishDuePost(row.id);
            }
            catch (error) {
                this.logger.warn(`Failed to publish post ${row.id}: ${String(error)}`);
            }
        }
    }
    async publishDuePost(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            include: postInclude,
        });
        if (!post) {
            return;
        }
        const validationError = this.validateForPublish(post);
        if (validationError) {
            await this.markFailed(postId, validationError);
            return;
        }
        const locked = await this.prisma.contentPost.updateMany({
            where: {
                id: postId,
                publishStatus: {
                    in: [
                        client_1.ContentPostPublishStatus.QUEUED,
                        client_1.ContentPostPublishStatus.FAILED,
                    ],
                },
            },
            data: {
                publishStatus: client_1.ContentPostPublishStatus.PUBLISHING,
                lastPublishAttemptAt: new Date(),
                publishAttempts: { increment: 1 },
            },
        });
        if (locked.count === 0) {
            return;
        }
        try {
            const credentials = await this.credentials.resolveForClientPublishing(post.clientId);
            const attachment = post.attachments[0];
            const imageUrl = await this.mediaResolver.resolvePublicImageUrl(attachment.url, post.id);
            let pageAccounts = [];
            let igProfileOk = false;
            let igProfileError = null;
            try {
                const pages = await this.graph.listPages(credentials.accessToken);
                pageAccounts = pages.map((page) => ({
                    pageId: page.id,
                    pageName: page.name ?? '',
                    igId: page.instagram_business_account?.id ?? null,
                    igUsername: page.instagram_business_account?.username ?? null,
                }));
                const storedId = credentials.instagramUserId;
                const matchesPageId = pageAccounts.some((p) => p.pageId === storedId);
                const matchesIgId = pageAccounts.some((p) => p.igId === storedId);
                try {
                    await this.graph.getUserProfile(storedId, credentials.accessToken);
                    igProfileOk = true;
                }
                catch (profileErr) {
                    igProfileError =
                        profileErr instanceof Error
                            ? profileErr.message
                            : String(profileErr);
                }
                agentDebug('instagram-publishing.service.ts:publishDuePost', 'meta token page/ig probe before createImageMedia', {
                    postId,
                    clientId: post.clientId,
                    storedInstagramUserId: storedId,
                    resolvedInstagramUserId: credentials.instagramUserId,
                    tokenSource: credentials.hasMetaAccessToken
                        ? 'client'
                        : 'company_or_env',
                    clientInstagramHandle: post.client.instagram,
                    matchesPageId,
                    matchesIgId,
                    igProfileOk,
                    igProfileError,
                    pageAccounts,
                    imageUrlHost: (() => {
                        try {
                            return new URL(imageUrl).host;
                        }
                        catch {
                            return 'invalid-url';
                        }
                    })(),
                }, matchesPageId && !matchesIgId ? 'A' : 'B');
            }
            catch (probeErr) {
                agentDebug('instagram-publishing.service.ts:publishDuePost', 'meta listPages probe failed', {
                    postId,
                    clientId: post.clientId,
                    storedInstagramUserId: credentials.instagramUserId,
                    probeError: probeErr instanceof Error ? probeErr.message : String(probeErr),
                }, 'C');
            }
            const container = await this.graph.createImageMedia(credentials.instagramUserId, credentials.accessToken, { imageUrl, caption: post.copy });
            await this.waitForContainerReady(container.id, credentials.accessToken);
            const published = await this.graph.publishMediaContainer(credentials.instagramUserId, credentials.accessToken, container.id);
            const permalink = await this.tryResolvePermalink(published.id, credentials.accessToken);
            await this.prisma.contentPost.update({
                where: { id: postId },
                data: {
                    publishStatus: client_1.ContentPostPublishStatus.PUBLISHED,
                    status: client_1.ContentPostStatus.PUBLISHED,
                    publishedAt: new Date(),
                    instagramMediaId: published.id,
                    instagramPermalink: permalink,
                    publishError: null,
                },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
            agentDebug('instagram-publishing.service.ts:publishDuePost', 'createImageMedia or publish failed', {
                postId,
                clientId: post.clientId,
                storedInstagramUserId: post.client.instagramUserId,
                errorMessage: message,
            }, 'E');
            const attempts = post.publishAttempts + 1;
            const finalFailed = attempts >= MAX_PUBLISH_ATTEMPTS;
            await this.prisma.contentPost.update({
                where: { id: postId },
                data: {
                    publishStatus: finalFailed
                        ? client_1.ContentPostPublishStatus.FAILED
                        : client_1.ContentPostPublishStatus.QUEUED,
                    publishError: message.slice(0, 2000),
                },
            });
        }
    }
    async waitForContainerReady(containerId, accessToken) {
        for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt += 1) {
            const status = await this.graph.getMediaContainerStatus(containerId, accessToken);
            const code = status.status_code?.toUpperCase();
            if (!code || code === 'FINISHED') {
                return;
            }
            if (code === 'ERROR' || code === 'EXPIRED') {
                throw new Error(`Container de mídia do Instagram em estado ${code}`);
            }
            await this.delay(CONTAINER_POLL_MS);
        }
    }
    async tryResolvePermalink(mediaId, accessToken) {
        try {
            const row = await this.graph.getMediaById(mediaId, accessToken);
            return row.permalink ?? null;
        }
        catch {
            return null;
        }
    }
    shouldQueueForPublish(post) {
        if (!post.publishToInstagram)
            return false;
        if (post.platform !== client_1.ContentPlatform.INSTAGRAM)
            return false;
        if (!post.scheduledDate)
            return false;
        if (post.attachments.length < 1)
            return false;
        if (post.status !== client_1.ContentPostStatus.SCHEDULED &&
            post.status !== client_1.ContentPostStatus.APPROVED) {
            return false;
        }
        if (post.format !== client_1.ContentPostFormat.STATIC)
            return false;
        return true;
    }
    validateForPublish(post) {
        if (!post.publishToInstagram) {
            return 'Publicação no Instagram não está habilitada para este post';
        }
        if (post.platform !== client_1.ContentPlatform.INSTAGRAM) {
            return 'Plataforma precisa ser Instagram';
        }
        if (!post.scheduledDate) {
            return 'Data de publicação não definida';
        }
        if (post.attachments.length < 1) {
            return 'Anexe pelo menos uma imagem antes de publicar';
        }
        if (post.format !== client_1.ContentPostFormat.STATIC) {
            return 'Publicação automática disponível apenas para posts estáticos (imagem) no momento';
        }
        if (post.status !== client_1.ContentPostStatus.SCHEDULED &&
            post.status !== client_1.ContentPostStatus.APPROVED) {
            return 'Post precisa estar aprovado ou agendado';
        }
        if (!post.copy?.trim()) {
            return 'Legenda (copy) é obrigatória';
        }
        return null;
    }
    async markFailed(postId, message) {
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                publishStatus: client_1.ContentPostPublishStatus.FAILED,
                publishError: message.slice(0, 2000),
            },
        });
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.InstagramPublishingService = InstagramPublishingService;
exports.InstagramPublishingService = InstagramPublishingService = InstagramPublishingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        instagram_credentials_resolver_1.InstagramCredentialsResolver,
        instagram_graph_client_1.InstagramGraphClient,
        instagram_publish_media_resolver_1.InstagramPublishMediaResolver])
], InstagramPublishingService);
//# sourceMappingURL=instagram-publishing.service.js.map