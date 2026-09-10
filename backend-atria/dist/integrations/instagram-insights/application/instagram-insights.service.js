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
var InstagramInsightsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramInsightsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const instagram_media_type_1 = require("../domain/instagram-media-type");
const instagram_insights_metrics_1 = require("../domain/instagram-insights.metrics");
const meta_token_expired_error_1 = require("../domain/meta-token-expired.error");
const instagram_credentials_resolver_1 = require("../infrastructure/instagram-credentials.resolver");
const instagram_graph_client_1 = require("../infrastructure/instagram-graph.client");
const instagram_insights_period_1 = require("../domain/instagram-insights.period");
const FEED_MEDIA_METRICS = ['likes', 'comments', 'shares', 'saved', 'reach'];
const STORY_MEDIA_METRICS = ['reach', 'views', 'replies', 'shares'];
let InstagramInsightsService = InstagramInsightsService_1 = class InstagramInsightsService {
    credentials;
    graph;
    logger = new common_1.Logger(InstagramInsightsService_1.name);
    constructor(credentials, graph) {
        this.credentials = credentials;
        this.graph = graph;
    }
    async listClients() {
        await this.credentials.syncFromMeta();
        const clients = await this.credentials.listConnectedClients();
        return { clients };
    }
    async listConversations(query = {}) {
        try {
            await this.credentials.syncFromMeta();
            const period = (0, instagram_insights_period_1.resolveInsightsPeriod)(query.month, query.year);
            const graphWindow = (0, instagram_insights_period_1.intersectWithLookback)(period);
            const clients = await this.credentials.listConnectedClients();
            const rows = await Promise.all(clients.map(async (client) => {
                try {
                    const resolved = await this.credentials.resolveForClient(client.id);
                    const messaging = await this.fetchConversations(resolved.instagramUserId, resolved.accessToken, graphWindow);
                    return {
                        id: client.id,
                        companyName: client.companyName,
                        avatarUrl: client.avatarUrl,
                        instagram: client.instagram,
                        conversationsStarted: messaging.conversationsStarted,
                        comments: messaging.comments,
                    };
                }
                catch (error) {
                    this.rethrowExpired(error);
                    this.logger.warn(`Failed to load conversations for ${client.companyName}: ${String(error)}`);
                    return {
                        id: client.id,
                        companyName: client.companyName,
                        avatarUrl: client.avatarUrl,
                        instagram: client.instagram,
                        conversationsStarted: 0,
                        comments: 0,
                    };
                }
            }));
            rows.sort((left, right) => {
                if (right.conversationsStarted !== left.conversationsStarted) {
                    return right.conversationsStarted - left.conversationsStarted;
                }
                return right.comments - left.comments;
            });
            return {
                period: {
                    month: period.month,
                    year: period.year,
                    label: period.label,
                    partial: graphWindow.partial,
                    accountMetricsAvailable: graphWindow.available,
                },
                clients: rows,
            };
        }
        catch (error) {
            if (error instanceof meta_token_expired_error_1.MetaTokenExpiredError) {
                throw new common_1.UnprocessableEntityException({
                    message: 'Token de acesso Meta expirado. Atualize as credenciais deste cliente.',
                    code: 'META_TOKEN_EXPIRED',
                });
            }
            throw error;
        }
    }
    async getClientMetrics(clientId, query = {}) {
        const period = (0, instagram_insights_period_1.resolveInsightsPeriod)(query.month, query.year);
        const graphWindow = (0, instagram_insights_period_1.intersectWithLookback)(period);
        try {
            const resolved = await this.credentials.resolveForClient(clientId);
            const [audience, media] = await Promise.all([
                this.fetchAudience(resolved.instagramUserId, resolved.accessToken, graphWindow),
                this.fetchMedia(resolved.instagramUserId, resolved.accessToken, period, query.contentType),
            ]);
            const audienceWithPosts = {
                ...audience,
                netFollowers: audience.newFollowers - audience.unfollows,
                postsCount: media.length,
            };
            return {
                client: {
                    id: resolved.clientId,
                    companyName: resolved.companyName,
                    avatarUrl: resolved.avatarUrl,
                    instagram: resolved.instagram,
                    instagramUserId: resolved.instagramUserId,
                    hasMetaAccessToken: resolved.hasMetaAccessToken,
                },
                audience: audienceWithPosts,
                media,
                period: {
                    month: period.month,
                    year: period.year,
                    label: period.label,
                    partial: graphWindow.partial,
                    accountMetricsAvailable: graphWindow.available,
                },
                empty: media.length === 0 &&
                    audience.reach === 0 &&
                    audience.newFollowers === 0 &&
                    audience.profileVisits === 0,
            };
        }
        catch (error) {
            if (error instanceof meta_token_expired_error_1.MetaTokenExpiredError) {
                throw new common_1.UnprocessableEntityException({
                    message: 'Token de acesso Meta expirado. Atualize as credenciais deste cliente.',
                    code: 'META_TOKEN_EXPIRED',
                });
            }
            throw error;
        }
    }
    async fetchAudience(igUserId, accessToken, windowBounds) {
        if (!windowBounds.available) {
            return {
                newFollowers: 0,
                unfollows: 0,
                profileVisits: 0,
                bioClicks: 0,
                reach: 0,
                engagement: 0,
                conversationsStarted: 0,
                comments: 0,
            };
        }
        const window = {
            period: 'day',
            since: String(windowBounds.since),
            until: String(windowBounds.until),
        };
        const [follows, reach, visits, engagement, messaging] = await Promise.all([
            this.safeAccountInsights(igUserId, accessToken, ['follows_and_unfollows'], {
                ...window,
                metric_type: 'total_value',
                breakdown: 'follow_type',
            }),
            this.safeAccountInsights(igUserId, accessToken, ['reach'], window),
            this.safeAccountInsights(igUserId, accessToken, ['profile_views', 'website_clicks', 'profile_links_taps'], {
                ...window,
                metric_type: 'total_value',
            }),
            this.safeAccountInsights(igUserId, accessToken, ['accounts_engaged', 'total_interactions'], {
                ...window,
                metric_type: 'total_value',
            }),
            this.safeAccountInsights(igUserId, accessToken, ['replies', 'comments'], {
                ...window,
                metric_type: 'total_value',
            }),
        ]);
        const followBreakdown = (0, instagram_insights_metrics_1.readFollowBreakdown)(follows);
        const newFollowers = followBreakdown.follows;
        return {
            newFollowers,
            unfollows: followBreakdown.unfollows,
            profileVisits: (0, instagram_insights_metrics_1.sumMetricValues)(visits, 'profile_views'),
            bioClicks: (0, instagram_insights_metrics_1.sumMetricValues)(visits, 'website_clicks') ||
                (0, instagram_insights_metrics_1.sumMetricValues)(visits, 'profile_links_taps'),
            reach: (0, instagram_insights_metrics_1.sumMetricValues)(reach, 'reach'),
            engagement: (0, instagram_insights_metrics_1.sumMetricValues)(engagement, 'accounts_engaged') ||
                (0, instagram_insights_metrics_1.sumMetricValues)(engagement, 'total_interactions'),
            conversationsStarted: (0, instagram_insights_metrics_1.sumMetricValues)(messaging, 'replies'),
            comments: (0, instagram_insights_metrics_1.sumMetricValues)(messaging, 'comments'),
        };
    }
    async fetchConversations(igUserId, accessToken, windowBounds) {
        if (!windowBounds.available) {
            return { conversationsStarted: 0, comments: 0 };
        }
        const messaging = await this.safeAccountInsights(igUserId, accessToken, ['replies', 'comments'], {
            period: 'day',
            since: String(windowBounds.since),
            until: String(windowBounds.until),
            metric_type: 'total_value',
        });
        return {
            conversationsStarted: (0, instagram_insights_metrics_1.sumMetricValues)(messaging, 'replies'),
            comments: (0, instagram_insights_metrics_1.sumMetricValues)(messaging, 'comments'),
        };
    }
    async fetchMedia(igUserId, accessToken, period, contentType) {
        const [feed, stories] = await Promise.all([
            this.graph
                .listMedia(igUserId, accessToken, {
                since: period.since,
                until: period.until,
            })
                .catch((error) => {
                this.rethrowExpired(error);
                this.logger.warn(`Failed to list Instagram media: ${String(error)}`);
                return [];
            }),
            this.graph.listStories(igUserId, accessToken).catch((error) => {
                this.rethrowExpired(error);
                this.logger.warn(`Failed to list Instagram stories: ${String(error)}`);
                return [];
            }),
        ]);
        const rows = [...feed, ...stories].filter((row) => (0, instagram_insights_period_1.isTimestampInPeriod)(row.timestamp, period.since, period.until));
        const insights = await Promise.all(rows.map((row) => this.toMediaInsight(row, accessToken)));
        return insights.filter((item) => (0, instagram_insights_metrics_1.matchesContentType)(item.contentType, contentType));
    }
    async toMediaInsight(row, accessToken) {
        const contentType = (0, instagram_media_type_1.mapInstagramMediaToContentType)(row.media_type, row.media_product_type);
        const isStory = contentType === client_1.KanbanTaskContentType.STORIES_NO_SCRIPT;
        const metrics = isStory ? STORY_MEDIA_METRICS : FEED_MEDIA_METRICS;
        const insightResponse = await this.graph
            .getMediaInsights(row.id, accessToken, metrics)
            .catch((error) => {
            this.rethrowExpired(error);
            return { data: [] };
        });
        const data = insightResponse.data;
        return {
            id: row.id,
            caption: row.caption ?? null,
            thumbnailUrl: (0, instagram_insights_metrics_1.mediaThumbnail)(row),
            permalink: row.permalink ?? null,
            timestamp: row.timestamp ?? null,
            contentType,
            likes: (0, instagram_insights_metrics_1.readNamedMetric)(data, ['likes']) || row.like_count || 0,
            comments: (0, instagram_insights_metrics_1.readNamedMetric)(data, ['comments', 'replies']) ||
                row.comments_count ||
                0,
            shares: (0, instagram_insights_metrics_1.readNamedMetric)(data, ['shares']),
            saves: (0, instagram_insights_metrics_1.readNamedMetric)(data, ['saved', 'saves']),
            reach: (0, instagram_insights_metrics_1.readNamedMetric)(data, ['reach', 'views']),
        };
    }
    async safeAccountInsights(igUserId, accessToken, metrics, extra) {
        try {
            return await this.graph.getAccountInsights(igUserId, accessToken, metrics, extra);
        }
        catch (error) {
            this.rethrowExpired(error);
            this.logger.warn(`Instagram account insight ${metrics.join(',')} failed: ${String(error)}`);
            return { data: [] };
        }
    }
    rethrowExpired(error) {
        if (error instanceof meta_token_expired_error_1.MetaTokenExpiredError) {
            throw error;
        }
    }
};
exports.InstagramInsightsService = InstagramInsightsService;
exports.InstagramInsightsService = InstagramInsightsService = InstagramInsightsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [instagram_credentials_resolver_1.InstagramCredentialsResolver,
        instagram_graph_client_1.InstagramGraphClient])
], InstagramInsightsService);
//# sourceMappingURL=instagram-insights.service.js.map