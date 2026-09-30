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
exports.MetaOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const secret_crypto_1 = require("../../common/crypto/secret-crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const instagram_graph_client_1 = require("../instagram-insights/infrastructure/instagram-graph.client");
const META_OAUTH_SCOPES = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
].join(',');
let MetaOAuthService = class MetaOAuthService {
    config;
    prisma;
    graph;
    constructor(config, prisma, graph) {
        this.config = config;
        this.prisma = prisma;
        this.graph = graph;
    }
    getRequiredScopes() {
        return META_OAUTH_SCOPES.split(',');
    }
    isConfigured() {
        return Boolean(this.appId() && this.appSecret() && this.redirectUri());
    }
    async buildAuthorizationUrl(clientId) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Integração Meta OAuth não configurada (META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI)');
        }
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        const state = this.signState(clientId);
        const url = new URL(`https://www.facebook.com/${this.graphVersion()}/dialog/oauth`);
        url.searchParams.set('client_id', this.appId());
        url.searchParams.set('redirect_uri', this.redirectUri());
        url.searchParams.set('scope', META_OAUTH_SCOPES);
        url.searchParams.set('state', state);
        url.searchParams.set('response_type', 'code');
        return url.toString();
    }
    async completeAuthorization(code, state) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Integração Meta OAuth não configurada');
        }
        const clientId = this.verifyState(state);
        const shortToken = await this.exchangeCodeForToken(code);
        const userToken = await this.exchangeForLongLivedToken(shortToken);
        const page = await this.resolveInstagramPage(userToken, clientId);
        if (!page?.instagram_business_account?.id || !page.access_token) {
            throw new common_1.BadRequestException('Nenhuma página do Facebook com conta Instagram profissional encontrada');
        }
        const ig = page.instagram_business_account;
        const handle = ig.username ? `@${ig.username.replace(/^@/, '')}` : null;
        await this.prisma.client.update({
            where: { id: clientId },
            data: {
                instagramUserId: ig.id,
                instagram: handle,
                metaAccessToken: this.encryptToken(page.access_token),
                avatarUrl: ig.profile_picture_url ?? undefined,
            },
        });
        return { clientId, instagramUsername: ig.username ?? null };
    }
    buildFrontendSuccessRedirect(clientId) {
        const base = this.frontendUrl().replace(/\/$/, '');
        return `${base}/clients?metaConnected=${encodeURIComponent(clientId)}`;
    }
    buildFrontendErrorRedirect(message) {
        const base = this.frontendUrl().replace(/\/$/, '');
        return `${base}/clients?metaError=${encodeURIComponent(message)}`;
    }
    async resolveInstagramPage(userToken, clientId) {
        const pages = await this.graph.listPages(userToken);
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: { instagramUserId: true },
        });
        const withIg = pages.filter((page) => page.instagram_business_account?.id);
        if (withIg.length === 0) {
            return null;
        }
        if (client?.instagramUserId) {
            const matched = withIg.find((page) => page.instagram_business_account?.id === client.instagramUserId);
            if (matched) {
                return matched;
            }
        }
        return withIg.length === 1 ? withIg[0] : withIg[0];
    }
    async exchangeCodeForToken(code) {
        const url = new URL(`${this.graphBase()}/oauth/access_token`);
        url.searchParams.set('client_id', this.appId());
        url.searchParams.set('client_secret', this.appSecret());
        url.searchParams.set('redirect_uri', this.redirectUri());
        url.searchParams.set('code', code);
        const response = await fetch(url);
        const payload = (await response.json());
        if (!response.ok || !payload.access_token) {
            throw new common_1.BadRequestException(payload.error?.message ?? 'Falha ao obter token do Meta');
        }
        return payload.access_token;
    }
    async exchangeForLongLivedToken(shortToken) {
        const url = new URL(`${this.graphBase()}/oauth/access_token`);
        url.searchParams.set('grant_type', 'fb_exchange_token');
        url.searchParams.set('client_id', this.appId());
        url.searchParams.set('client_secret', this.appSecret());
        url.searchParams.set('fb_exchange_token', shortToken);
        const response = await fetch(url);
        const payload = (await response.json());
        if (!response.ok || !payload.access_token) {
            throw new common_1.BadRequestException(payload.error?.message ?? 'Falha ao renovar token do Meta');
        }
        return payload.access_token;
    }
    signState(clientId) {
        const payload = Buffer.from(JSON.stringify({ clientId, ts: Date.now() })).toString('base64url');
        const signature = (0, crypto_1.createHmac)('sha256', this.stateSecret())
            .update(payload)
            .digest('base64url');
        return `${payload}.${signature}`;
    }
    verifyState(state) {
        const [payload, signature] = state.split('.');
        if (!payload || !signature) {
            throw new common_1.BadRequestException('State OAuth inválido');
        }
        const expected = (0, crypto_1.createHmac)('sha256', this.stateSecret())
            .update(payload)
            .digest('base64url');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length ||
            !(0, crypto_1.timingSafeEqual)(sigBuf, expBuf)) {
            throw new common_1.BadRequestException('State OAuth inválido');
        }
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!parsed.clientId || !parsed.ts) {
            throw new common_1.BadRequestException('State OAuth inválido');
        }
        if (Date.now() - parsed.ts > 15 * 60 * 1000) {
            throw new common_1.BadRequestException('Sessão OAuth expirada');
        }
        return parsed.clientId;
    }
    encryptToken(token) {
        const secret = this.config.get('TENANT_SECRETS_KEY')?.trim() ||
            this.config.getOrThrow('JWT_ACCESS_SECRET');
        return (0, secret_crypto_1.encryptSecret)(token.trim(), secret);
    }
    appId() {
        return this.config.get('META_APP_ID')?.trim() || null;
    }
    appSecret() {
        return this.config.get('META_APP_SECRET')?.trim() || null;
    }
    redirectUri() {
        return this.config.get('META_OAUTH_REDIRECT_URI')?.trim() || null;
    }
    graphVersion() {
        return (this.config.get('META_API_VERSION')?.trim() || 'v21.0').replace(/^\/+/, '');
    }
    graphBase() {
        return `https://graph.facebook.com/${this.graphVersion()}`;
    }
    frontendUrl() {
        return (this.config.get('FRONTEND_URL')?.trim() ||
            this.config.get('APP_URL')?.trim() ||
            'http://localhost:3000');
    }
    stateSecret() {
        return this.config.getOrThrow('JWT_ACCESS_SECRET');
    }
};
exports.MetaOAuthService = MetaOAuthService;
exports.MetaOAuthService = MetaOAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        instagram_graph_client_1.InstagramGraphClient])
], MetaOAuthService);
//# sourceMappingURL=meta-oauth.service.js.map