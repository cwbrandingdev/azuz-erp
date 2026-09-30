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
var MetaPublishingSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaPublishingSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../../notifications/notifications.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const instagram_credentials_resolver_1 = require("../instagram-insights/infrastructure/instagram-credentials.resolver");
const instagram_graph_client_1 = require("../instagram-insights/infrastructure/instagram-graph.client");
const SAO_PAULO_TZ = 'America/Sao_Paulo';
const GRACE_AFTER_SCHEDULE_MS = 2 * 60 * 1000;
let MetaPublishingSyncService = MetaPublishingSyncService_1 = class MetaPublishingSyncService {
    prisma;
    graph;
    credentials;
    notifications;
    logger = new common_1.Logger(MetaPublishingSyncService_1.name);
    constructor(prisma, graph, credentials, notifications) {
        this.prisma = prisma;
        this.graph = graph;
        this.credentials = credentials;
        this.notifications = notifications;
    }
    async syncScheduledPublications() {
        if (process.env.JEST_WORKER_ID) {
            return;
        }
        const now = Date.now();
        const dueBefore = new Date(now - GRACE_AFTER_SCHEDULE_MS);
        const posts = await this.prisma.contentPost.findMany({
            where: {
                metaPublishStatus: client_1.MetaPublishStatus.SCHEDULED,
                metaIgMediaId: { not: null },
                metaScheduledAt: { lte: dueBefore },
            },
            select: {
                id: true,
                clientId: true,
                metaIgMediaId: true,
                metaScheduledAt: true,
            },
            take: 50,
        });
        for (const post of posts) {
            if (!post.metaIgMediaId) {
                continue;
            }
            try {
                await this.syncOnePost(post.id, post.clientId, post.metaIgMediaId);
            }
            catch (error) {
                this.logger.debug(`Meta sync skip post ${post.id}: ${String(error)}`);
            }
        }
    }
    async syncPostByContentPostId(postId) {
        const post = await this.prisma.contentPost.findUnique({
            where: { id: postId },
            select: {
                id: true,
                clientId: true,
                metaIgMediaId: true,
                metaPublishStatus: true,
            },
        });
        if (!post?.metaIgMediaId ||
            post.metaPublishStatus !== client_1.MetaPublishStatus.SCHEDULED) {
            return false;
        }
        return this.syncOnePost(post.id, post.clientId, post.metaIgMediaId);
    }
    async syncOnePost(postId, clientId, mediaId) {
        const creds = await this.credentials.resolveForClient(clientId);
        const media = await this.graph.getInstagramMedia(mediaId, creds.accessToken);
        const publishedAt = media.timestamp
            ? new Date(media.timestamp)
            : null;
        const isLive = Boolean(media.permalink) ||
            (publishedAt != null && !Number.isNaN(publishedAt.getTime()));
        if (!isLive) {
            return false;
        }
        await this.prisma.contentPost.update({
            where: { id: postId },
            data: {
                metaPublishStatus: client_1.MetaPublishStatus.PUBLISHED,
                metaPublishedAt: publishedAt ?? new Date(),
                metaIgPermalink: media.permalink ?? undefined,
                metaPublishError: null,
                status: client_1.ContentPostStatus.PUBLISHED,
            },
        });
        const task = await this.prisma.kanbanTask.findFirst({
            where: { contentPostId: postId, deletedAt: null },
            select: { id: true, title: true, companyId: true },
        });
        if (task) {
            await this.notifications.notifyMetaInstagramPublish({
                companyId: task.companyId,
                taskId: task.id,
                taskTitle: task.title,
                published: true,
            });
        }
        return true;
    }
};
exports.MetaPublishingSyncService = MetaPublishingSyncService;
__decorate([
    (0, schedule_1.Cron)('*/5 * * * *', { timeZone: SAO_PAULO_TZ }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetaPublishingSyncService.prototype, "syncScheduledPublications", null);
exports.MetaPublishingSyncService = MetaPublishingSyncService = MetaPublishingSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        instagram_graph_client_1.InstagramGraphClient,
        instagram_credentials_resolver_1.InstagramCredentialsResolver,
        notifications_service_1.NotificationsService])
], MetaPublishingSyncService);
//# sourceMappingURL=meta-publishing.sync.service.js.map