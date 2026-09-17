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
var InstagramApifyEnricher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramApifyEnricher = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const APIFY_TIMEOUT_MS = 120_000;
const DEFAULT_ACTOR = 'apify~instagram-scraper';
const POSTS_FETCH_LIMIT = 15;
let InstagramApifyEnricher = InstagramApifyEnricher_1 = class InstagramApifyEnricher {
    configService;
    logger = new common_1.Logger(InstagramApifyEnricher_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async fetchProfileSignals(instagram, apifyToken) {
        const username = this.extractUsername(instagram);
        if (!username) {
            return null;
        }
        const profileUrl = `https://www.instagram.com/${username}/`;
        const actorId = this.configService.get('APIFY_INSTAGRAM_ACTOR')?.trim() ||
            DEFAULT_ACTOR;
        try {
            const [postRows, detailRows] = await Promise.all([
                this.runActor(actorId, apifyToken, {
                    directUrls: [profileUrl],
                    resultsType: 'posts',
                    resultsLimit: POSTS_FETCH_LIMIT,
                }),
                this.runActor(actorId, apifyToken, {
                    directUrls: [profileUrl],
                    resultsType: 'details',
                    resultsLimit: 1,
                }),
            ]);
            const posts = this.mapRecentNonPinnedPosts(postRows);
            const lastPostAt = posts[0]?.timestamp ?? null;
            const daysSinceLastPost = this.daysSince(lastPostAt);
            const recentTwo = posts.slice(0, 2);
            const profile = this.mapProfileDetails(detailRows, username);
            return {
                username,
                profileUrl,
                biography: profile.biography,
                followersCount: profile.followersCount,
                followsCount: profile.followsCount,
                isBusinessAccount: profile.isBusinessAccount,
                businessCategoryName: profile.businessCategoryName,
                externalUrl: profile.externalUrl,
                recentPosts: recentTwo,
                lastPostAt,
                daysSinceLastPost,
                averageLikesRecent: this.averageMetric(recentTwo.map((post) => post.likes)),
                averageViewsRecent: this.averageMetric(recentTwo.map((post) => post.views)),
                fetchedAt: new Date().toISOString(),
                provider: 'apify',
            };
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException) {
                throw error;
            }
            if (error instanceof common_1.RequestTimeoutException) {
                throw error;
            }
            this.logger.warn(`Apify Instagram request failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível conectar ao Apify para Instagram.');
        }
    }
    extractUsername(value) {
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        const fromUrl = trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)?.[1];
        if (fromUrl) {
            return fromUrl.replace(/\/$/, '').toLowerCase();
        }
        const handle = trimmed.replace(/^@/, '').split(/[/?#]/)[0]?.trim();
        return handle ? handle.toLowerCase() : null;
    }
    async runActor(actorId, apifyToken, payload) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);
        try {
            const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const bodyText = await response.text();
            let body;
            try {
                body = bodyText ? JSON.parse(bodyText) : [];
            }
            catch {
                body = [];
            }
            if (!response.ok) {
                this.logger.warn(`Apify Instagram error ${response.status}: ${bodyText.slice(0, 400)}`);
                throw new common_1.BadGatewayException('Não foi possível buscar dados do Instagram no Apify.');
            }
            return Array.isArray(body) ? body : [];
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException) {
                throw error;
            }
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('A consulta ao Instagram no Apify excedeu o tempo limite.');
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    mapProfileDetails(rows, username) {
        const row = rows.find((item) => {
            const handle = String(item.username ?? item.ownerUsername ?? '')
                .trim()
                .toLowerCase();
            return !handle || handle === username;
        }) ?? rows[0];
        if (!row) {
            return {
                biography: null,
                followersCount: null,
                followsCount: null,
                isBusinessAccount: null,
                businessCategoryName: null,
                externalUrl: null,
            };
        }
        const bioRaw = row.biography ?? row.bio;
        const biography = typeof bioRaw === 'string' && bioRaw.trim() ? bioRaw.trim() : null;
        const categoryRaw = row.businessCategoryName ?? row.category;
        const businessCategoryName = typeof categoryRaw === 'string' && categoryRaw.trim()
            ? categoryRaw.trim()
            : null;
        const externalRaw = row.externalUrl ?? row.website;
        const externalUrl = typeof externalRaw === 'string' && externalRaw.trim()
            ? externalRaw.trim()
            : null;
        return {
            biography,
            followersCount: this.readNumber(row.followersCount, row.followers),
            followsCount: this.readNumber(row.followsCount, row.follows),
            isBusinessAccount: typeof row.isBusinessAccount === 'boolean'
                ? row.isBusinessAccount
                : null,
            businessCategoryName,
            externalUrl,
        };
    }
    mapRecentNonPinnedPosts(rows) {
        return rows
            .map((row) => ({
            likes: this.readLikes(row),
            views: this.readViews(row),
            timestamp: this.readTimestamp(row),
            isPinned: Boolean(row.isPinned ?? row.pinned),
        }))
            .filter((post) => !post.isPinned)
            .sort((a, b) => {
            const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
            const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
            return bTime - aTime;
        });
    }
    readNumber(...candidates) {
        for (const value of candidates) {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
        }
        return null;
    }
    readLikes(row) {
        return this.readNumber(row.likesCount, row.likes, row.likeCount);
    }
    readViews(row) {
        return this.readNumber(row.videoViewCount, row.viewCount, row.viewsCount, row.videoPlayCount, row.playCount, row.plays);
    }
    readTimestamp(row) {
        const value = row.timestamp ?? row.takenAt;
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
        return null;
    }
    daysSince(iso) {
        if (!iso)
            return null;
        const ms = Date.parse(iso);
        if (!Number.isFinite(ms))
            return null;
        return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    }
    averageMetric(values) {
        const numbers = values.filter((n) => n != null);
        if (numbers.length === 0)
            return null;
        return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
    }
};
exports.InstagramApifyEnricher = InstagramApifyEnricher;
exports.InstagramApifyEnricher = InstagramApifyEnricher = InstagramApifyEnricher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], InstagramApifyEnricher);
//# sourceMappingURL=instagram-apify.enricher.js.map