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
var InstagramCredentialsResolver_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramCredentialsResolver = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const secret_crypto_1 = require("../../../common/crypto/secret-crypto");
const company_constants_1 = require("../../../company/company.constants");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
const instagram_graph_client_1 = require("./instagram-graph.client");
let InstagramCredentialsResolver = InstagramCredentialsResolver_1 = class InstagramCredentialsResolver {
    prisma;
    config;
    companySettings;
    graph;
    logger = new common_1.Logger(InstagramCredentialsResolver_1.name);
    constructor(prisma, config, companySettings, graph) {
        this.prisma = prisma;
        this.config = config;
        this.companySettings = companySettings;
        this.graph = graph;
    }
    async listConnectedClients() {
        const clients = await this.prisma.client.findMany({
            where: {
                isActive: true,
                instagramUserId: { not: null },
            },
            orderBy: { companyName: 'asc' },
            select: {
                id: true,
                companyName: true,
                avatarUrl: true,
                instagram: true,
                instagramUserId: true,
                metaAccessToken: true,
            },
        });
        return clients
            .filter((client) => Boolean(client.instagramUserId?.trim()))
            .map((client) => ({
            id: client.id,
            companyName: client.companyName,
            avatarUrl: client.avatarUrl,
            instagram: client.instagram,
            instagramUserId: client.instagramUserId,
            hasMetaAccessToken: Boolean(client.metaAccessToken),
        }));
    }
    async syncFromMeta() {
        const accessToken = await this.resolveTenantAccessToken();
        if (!accessToken) {
            return;
        }
        try {
            const pages = await this.graph.listPages(accessToken);
            for (const page of pages) {
                const instagram = page.instagram_business_account;
                if (!instagram?.id) {
                    continue;
                }
                await this.upsertClientFromInstagram(page, instagram);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to sync Instagram accounts: ${String(error)}`);
        }
    }
    async resolveForClient(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: {
                id: true,
                companyName: true,
                avatarUrl: true,
                instagram: true,
                instagramUserId: true,
                metaAccessToken: true,
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        const clientToken = this.decrypt(client.metaAccessToken);
        const accessToken = clientToken ?? (await this.resolveTenantAccessToken());
        const instagramUserId = client.instagramUserId?.trim() ?? '';
        if (!instagramUserId) {
            throw new common_1.NotFoundException('Conta Instagram não configurada para este cliente');
        }
        if (!accessToken) {
            throw new common_1.NotFoundException('Token de acesso Meta não configurado para este cliente');
        }
        return {
            clientId: client.id,
            companyName: client.companyName,
            avatarUrl: client.avatarUrl,
            instagram: client.instagram,
            instagramUserId,
            accessToken,
            hasMetaAccessToken: Boolean(client.metaAccessToken),
        };
    }
    async resolveForClientPublishing(clientId) {
        const base = await this.resolveForClient(clientId);
        const storedId = base.instagramUserId;
        const pages = await this.graph.listPages(base.accessToken);
        const handle = normalizeInstagramHandleForMatch(base.instagram);
        for (const page of pages) {
            const ig = page.instagram_business_account;
            const igId = ig?.id?.trim() ?? '';
            if (igId && storedId === igId) {
                return base;
            }
            if (storedId === page.id) {
                if (!igId) {
                    throw new common_1.BadRequestException(`A Página do Facebook "${page.name ?? page.id}" não está vinculada a uma conta Instagram no Meta. No Facebook/Meta Business, conecte o Instagram @${handle?.replace(/^@/, '') ?? 'da marca'} a esta Página e tente novamente.`);
                }
                await this.prisma.client.update({
                    where: { id: clientId },
                    data: { instagramUserId: igId },
                });
                fetch('http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': 'ff56e0',
                    },
                    body: JSON.stringify({
                        sessionId: 'ff56e0',
                        location: 'instagram-credentials.resolver.ts:resolveForClientPublishing',
                        message: 'corrected page id to instagram business id',
                        data: { clientId, pageId: page.id, igId },
                        hypothesisId: 'A-fix',
                        timestamp: Date.now(),
                        runId: 'post-fix',
                    }),
                }).catch(() => { });
                return { ...base, instagramUserId: igId };
            }
            if (ig && igId && handle && ig.username) {
                const pageHandle = normalizeInstagramHandleForMatch(ig.username);
                if (pageHandle && pageHandle === handle) {
                    if (storedId !== igId) {
                        await this.prisma.client.update({
                            where: { id: clientId },
                            data: { instagramUserId: igId },
                        });
                    }
                    return { ...base, instagramUserId: igId };
                }
            }
        }
        throw new common_1.BadRequestException('O Instagram User ID do cliente não corresponde a nenhuma Página/Instagram acessível com o token configurado. Atualize o token em Integrações ou corrija o ID em Clientes.');
    }
    async upsertClientFromInstagram(page, instagram) {
        const handle = normalizeInstagramHandle(instagram.username);
        const companyName = instagram.name?.trim() || page.name?.trim() || handle || instagram.id;
        const existing = await this.findMatchingClient(instagram.id, handle, companyName);
        if (existing) {
            await this.prisma.client.update({
                where: { id: existing.id },
                data: {
                    instagramUserId: instagram.id,
                    instagram: handle ?? existing.instagram,
                    avatarUrl: instagram.profile_picture_url ?? existing.avatarUrl,
                },
            });
            return;
        }
        await this.prisma.client.create({
            data: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                companyName,
                instagram: handle,
                instagramUserId: instagram.id,
                avatarUrl: instagram.profile_picture_url ?? null,
                isActive: true,
            },
        });
    }
    async findMatchingClient(instagramUserId, handle, companyName) {
        const byId = await this.prisma.client.findFirst({
            where: { instagramUserId },
        });
        if (byId) {
            return byId;
        }
        if (handle) {
            const variants = [handle, handle.replace(/^@/, ''), `@${handle.replace(/^@/, '')}`];
            const byHandle = await this.prisma.client.findFirst({
                where: {
                    instagram: { in: variants, mode: 'insensitive' },
                },
            });
            if (byHandle) {
                return byHandle;
            }
        }
        return this.prisma.client.findFirst({
            where: {
                companyName: { equals: companyName, mode: 'insensitive' },
            },
        });
    }
    async resolveTenantAccessToken() {
        const companyToken = await this.resolveCompanyToken();
        if (companyToken) {
            return companyToken;
        }
        const envToken = this.config.get('META_ACCESS_TOKEN')?.trim();
        if (!envToken) {
            return null;
        }
        try {
            await this.companySettings.updateIntegrations({
                metaPageAccessToken: envToken,
            });
        }
        catch (error) {
            this.logger.warn(`Could not persist tenant Meta token: ${String(error)}`);
        }
        return envToken;
    }
    async resolveCompanyToken() {
        try {
            const credentials = await this.companySettings.getMetaCredentialsForCurrentTenant();
            return credentials.metaPageAccessToken?.trim() || null;
        }
        catch {
            return null;
        }
    }
    decrypt(value) {
        if (!value) {
            return null;
        }
        try {
            const secret = this.config.get('TENANT_SECRETS_KEY')?.trim() ||
                this.config.getOrThrow('JWT_ACCESS_SECRET');
            return (0, secret_crypto_1.decryptSecret)(value, secret).trim() || null;
        }
        catch {
            return null;
        }
    }
};
exports.InstagramCredentialsResolver = InstagramCredentialsResolver;
exports.InstagramCredentialsResolver = InstagramCredentialsResolver = InstagramCredentialsResolver_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        company_settings_service_1.CompanySettingsService,
        instagram_graph_client_1.InstagramGraphClient])
], InstagramCredentialsResolver);
function normalizeInstagramHandleForMatch(username) {
    const trimmed = username?.trim().replace(/^@/, '').toLowerCase();
    if (!trimmed) {
        return null;
    }
    return `@${trimmed}`;
}
function normalizeInstagramHandle(username) {
    const trimmed = username?.trim().replace(/^@/, '');
    if (!trimmed) {
        return null;
    }
    return `@${trimmed.toLowerCase()}`;
}
//# sourceMappingURL=instagram-credentials.resolver.js.map