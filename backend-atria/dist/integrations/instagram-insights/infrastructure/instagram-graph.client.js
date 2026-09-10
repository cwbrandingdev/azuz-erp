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
exports.InstagramGraphClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const meta_token_expired_error_1 = require("../domain/meta-token-expired.error");
const DEFAULT_GRAPH_VERSION = 'v21.0';
let InstagramGraphClient = class InstagramGraphClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async listPages(accessToken) {
        const response = await this.getJson('/me/accounts', {
            fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url}',
            limit: '100',
            access_token: accessToken,
        });
        return response.data ?? [];
    }
    async getUserProfile(igUserId, accessToken) {
        return this.getJson(`/${igUserId}`, {
            fields: 'id,username,name,profile_picture_url,followers_count',
            access_token: accessToken,
        });
    }
    async getAccountInsights(igUserId, accessToken, metrics, extra = {}) {
        return this.getJson(`/${igUserId}/insights`, {
            metric: metrics.join(','),
            access_token: accessToken,
            ...extra,
        });
    }
    async listMedia(igUserId, accessToken, options = {}) {
        const rows = [];
        let after;
        const pageSize = String(options.limit ?? 50);
        for (let page = 0; page < 8; page += 1) {
            const params = {
                fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
                limit: pageSize,
                access_token: accessToken,
            };
            if (after) {
                params.after = after;
            }
            const response = await this.getJson(`/${igUserId}/media`, params);
            const data = response.data ?? [];
            if (data.length === 0) {
                break;
            }
            let reachedOlder = false;
            for (const row of data) {
                const timestamp = row.timestamp
                    ? Math.floor(Date.parse(row.timestamp) / 1000)
                    : null;
                if (timestamp == null || Number.isNaN(timestamp)) {
                    continue;
                }
                if (options.until && timestamp >= options.until) {
                    continue;
                }
                if (options.since && timestamp < options.since) {
                    reachedOlder = true;
                    continue;
                }
                rows.push(row);
            }
            if (reachedOlder) {
                break;
            }
            after = response.paging?.cursors?.after;
            if (!after) {
                break;
            }
        }
        return rows;
    }
    async listStories(igUserId, accessToken) {
        const response = await this.getJson(`/${igUserId}/stories`, {
            fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp',
            access_token: accessToken,
        });
        return (response.data ?? []).map((item) => ({
            ...item,
            media_product_type: item.media_product_type ?? 'STORY',
            media_type: item.media_type ?? 'STORY',
        }));
    }
    async getMediaInsights(mediaId, accessToken, metrics) {
        return this.getJson(`/${mediaId}/insights`, {
            metric: metrics.join(','),
            access_token: accessToken,
        });
    }
    async getJson(path, params) {
        const url = new URL(`${this.graphBase()}${path}`);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        const response = await fetch(url);
        let payload;
        try {
            payload = (await response.json());
        }
        catch {
            if (response.status === 401) {
                throw new meta_token_expired_error_1.MetaTokenExpiredError();
            }
            throw new Error('Falha na API do Meta');
        }
        const graphError = payload.error;
        if (graphError) {
            if ((0, meta_token_expired_error_1.isMetaTokenExpired)(graphError) || response.status === 401) {
                throw new meta_token_expired_error_1.MetaTokenExpiredError();
            }
            throw new Error(graphError.message ?? 'Falha na API do Meta');
        }
        if (!response.ok) {
            if (response.status === 401) {
                throw new meta_token_expired_error_1.MetaTokenExpiredError();
            }
            throw new Error('Falha na API do Meta');
        }
        return payload;
    }
    graphBase() {
        const version = this.config.get('META_API_VERSION')?.trim() ||
            DEFAULT_GRAPH_VERSION;
        return `https://graph.facebook.com/${version.replace(/^\/+/, '')}`;
    }
};
exports.InstagramGraphClient = InstagramGraphClient;
exports.InstagramGraphClient = InstagramGraphClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], InstagramGraphClient);
//# sourceMappingURL=instagram-graph.client.js.map