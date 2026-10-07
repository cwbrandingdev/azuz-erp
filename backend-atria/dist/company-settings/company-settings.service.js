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
exports.CompanySettingsService = exports.MASKED_SECRET = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const secret_crypto_1 = require("../common/crypto/secret-crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const company_constants_1 = require("../company/company.constants");
exports.MASKED_SECRET = '********';
let CompanySettingsService = class CompanySettingsService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async getSettings() {
        const company = await this.loadCurrentCompany();
        return this.toSettingsResponse(company);
    }
    async updateSettings(dto) {
        const company = await this.loadCurrentCompany();
        const secretKey = this.getSecretKey();
        const data = {};
        if (dto.hasCrmModuleEnabled !== undefined) {
            data.hasCrmModuleEnabled = dto.hasCrmModuleEnabled;
        }
        if (dto.metaAdAccountId !== undefined) {
            data.metaAdAccountId = this.normalizeOptionalString(dto.metaAdAccountId);
        }
        if (dto.metaAppId !== undefined) {
            data.metaAppId = this.normalizeOptionalString(dto.metaAppId);
        }
        if (dto.metaPageAccessToken !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.metaPageAccessToken)) {
                data.metaPageAccessToken = this.normalizeSecretInput(dto.metaPageAccessToken, secretKey);
            }
        }
        if (dto.metaAppSecret !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.metaAppSecret)) {
                data.metaAppSecret = this.normalizeSecretInput(dto.metaAppSecret, secretKey);
            }
        }
        const updated = await this.updateCompany(company.id, data);
        return this.toSettingsResponse(updated);
    }
    async getIntegrations() {
        const company = await this.loadCurrentCompany();
        return this.toIntegrationsResponse(company);
    }
    async updateIntegrations(dto) {
        const company = await this.loadCurrentCompany();
        const secretKey = this.getSecretKey();
        const data = {};
        if (dto.metaAdAccountId !== undefined) {
            data.metaAdAccountId = this.normalizeOptionalString(dto.metaAdAccountId);
        }
        if (dto.metaAppId !== undefined) {
            data.metaAppId = this.normalizeOptionalString(dto.metaAppId);
        }
        if (dto.metaPageAccessToken !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.metaPageAccessToken)) {
                data.metaPageAccessToken = this.normalizeSecretInput(dto.metaPageAccessToken, secretKey);
            }
        }
        if (dto.metaAppSecret !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.metaAppSecret)) {
                data.metaAppSecret = this.normalizeSecretInput(dto.metaAppSecret, secretKey);
            }
        }
        if (dto.apifyApiToken !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.apifyApiToken)) {
                data.apifyApiToken = this.normalizeSecretInput(dto.apifyApiToken, secretKey);
            }
        }
        if (dto.whatsappApiToken !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.whatsappApiToken)) {
                data.whatsappApiToken = this.normalizeSecretInput(dto.whatsappApiToken, secretKey);
            }
        }
        if (dto.whatsappPhoneNumberId !== undefined) {
            data.whatsappPhoneNumberId = this.normalizeOptionalString(dto.whatsappPhoneNumberId);
        }
        if (dto.whatsappBusinessAccountId !== undefined) {
            data.whatsappBusinessAccountId = this.normalizeOptionalString(dto.whatsappBusinessAccountId);
        }
        if (dto.whatsappVerifyToken !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.whatsappVerifyToken)) {
                data.whatsappVerifyToken = this.normalizeSecretInput(dto.whatsappVerifyToken, secretKey);
            }
        }
        if (dto.whatsappEmbeddedSignupConfigId !== undefined) {
            data.whatsappEmbeddedSignupConfigId = this.normalizeOptionalString(dto.whatsappEmbeddedSignupConfigId);
        }
        if (dto.whatsappAppId !== undefined) {
            data.whatsappAppId = this.normalizeOptionalString(dto.whatsappAppId);
        }
        if (dto.whatsappAppSecret !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(dto.whatsappAppSecret)) {
                data.whatsappAppSecret = this.normalizeSecretInput(dto.whatsappAppSecret, secretKey);
            }
        }
        const updated = await this.updateCompany(company.id, data);
        return this.toIntegrationsResponse(updated);
    }
    async getMetaCredentialsForCurrentTenant() {
        const credentials = await this.getIntegrationCredentialsForCurrentTenant();
        return {
            metaAdAccountId: credentials.metaAdAccountId,
            metaPageAccessToken: credentials.metaPageAccessToken,
            metaAppId: credentials.metaAppId,
            metaAppSecret: credentials.metaAppSecret,
        };
    }
    async getScraperCredentialsForCurrentTenant() {
        const credentials = await this.getIntegrationCredentialsForCurrentTenant();
        return {
            apifyApiToken: credentials.apifyApiToken,
        };
    }
    async getWhatsappCredentialsForCurrentTenant() {
        const company = await this.loadCurrentCompany();
        return this.toWhatsappCredentials(company);
    }
    async findWhatsappCredentialsByPhoneNumberId(phoneNumberId) {
        const normalized = phoneNumberId.trim();
        if (!normalized)
            return null;
        const company = await this.prisma.company.findFirst({
            where: { whatsappPhoneNumberId: normalized },
        });
        if (!company)
            return null;
        return this.toWhatsappCredentials(company);
    }
    async findWhatsappCredentialsByVerifyToken(token) {
        const normalized = token.trim();
        if (!normalized)
            return null;
        const companies = await this.prisma.company.findMany({
            where: { whatsappVerifyToken: { not: null } },
        });
        const secretKey = this.getSecretKey();
        for (const company of companies) {
            const stored = this.decryptOptionalSecret(company.whatsappVerifyToken, secretKey);
            if (stored && stored === normalized) {
                return this.toWhatsappCredentials(company);
            }
        }
        return null;
    }
    async getMetaAppAuthForCurrentTenant() {
        const company = await this.loadCurrentCompany();
        const secretKey = this.getSecretKey();
        return {
            appId: company.whatsappAppId?.trim() ||
                this.config.get('WHATSAPP_APP_ID')?.trim() ||
                this.config.get('META_APP_ID')?.trim() ||
                null,
            appSecret: this.decryptOptionalSecret(company.whatsappAppSecret, secretKey) ||
                this.config.get('WHATSAPP_APP_SECRET')?.trim() ||
                this.config.get('META_APP_SECRET')?.trim() ||
                null,
        };
    }
    async getWhatsappEmbeddedSignupPublicConfig() {
        const company = await this.loadCurrentCompany();
        const appId = company.whatsappAppId?.trim() ||
            this.config.get('WHATSAPP_APP_ID')?.trim() ||
            this.config.get('META_APP_ID')?.trim() ||
            null;
        const configId = company.whatsappEmbeddedSignupConfigId?.trim() ||
            this.config.get('WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID')?.trim() ||
            null;
        return {
            enabled: Boolean(appId && configId),
            appId,
            configId,
        };
    }
    async saveWhatsappConnection(input) {
        const company = await this.loadCurrentCompany();
        const secretKey = this.getSecretKey();
        await this.updateCompany(company.id, {
            whatsappApiToken: (0, secret_crypto_1.encryptSecret)(input.accessToken, secretKey),
            whatsappPhoneNumberId: input.phoneNumberId,
            whatsappBusinessAccountId: input.businessAccountId,
        });
    }
    async getIntegrationCredentialsForCurrentTenant() {
        const company = await this.loadCurrentCompany();
        const secretKey = this.getSecretKey();
        return {
            metaAdAccountId: company.metaAdAccountId,
            metaPageAccessToken: this.decryptOptionalSecret(company.metaPageAccessToken, secretKey),
            metaAppId: company.metaAppId,
            metaAppSecret: this.decryptOptionalSecret(company.metaAppSecret, secretKey),
            apifyApiToken: this.decryptOptionalSecret(company.apifyApiToken, secretKey),
            whatsappApiToken: this.decryptOptionalSecret(company.whatsappApiToken, secretKey),
        };
    }
    async loadCurrentCompany() {
        const company = (await this.prisma.company.findUnique({
            where: { id: company_constants_1.DEFAULT_COMPANY_ID },
        })) ??
            (await this.prisma.company.findFirst({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'asc' },
            }));
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async updateCompany(companyId, data) {
        return this.prisma.company.update({
            where: { id: companyId },
            data,
        });
    }
    toSettingsResponse(company) {
        const secretKey = this.getSecretKey();
        return {
            id: company.id,
            name: company.name,
            subdomain: company.subdomain,
            hasCrmModuleEnabled: company.hasCrmModuleEnabled,
            metaAdAccountId: company.metaAdAccountId,
            metaAppId: company.metaAppId,
            metaPageAccessToken: this.maskOptionalSecret(company.metaPageAccessToken, secretKey),
            metaAppSecret: this.maskOptionalSecret(company.metaAppSecret, secretKey),
            hasMetaPageAccessToken: Boolean(company.metaPageAccessToken),
            hasMetaAppSecret: Boolean(company.metaAppSecret),
            updatedAt: company.updatedAt.toISOString(),
        };
    }
    toIntegrationsResponse(company) {
        const secretKey = this.getSecretKey();
        return {
            metaAdAccountId: company.metaAdAccountId,
            metaAppId: company.metaAppId,
            metaPageAccessToken: this.maskOptionalSecret(company.metaPageAccessToken, secretKey),
            metaAppSecret: this.maskOptionalSecret(company.metaAppSecret, secretKey),
            apifyApiToken: this.maskOptionalSecret(company.apifyApiToken, secretKey),
            whatsappApiToken: this.maskOptionalSecret(company.whatsappApiToken, secretKey),
            whatsappPhoneNumberId: company.whatsappPhoneNumberId,
            whatsappBusinessAccountId: company.whatsappBusinessAccountId,
            whatsappVerifyToken: this.maskOptionalSecret(company.whatsappVerifyToken, secretKey),
            whatsappEmbeddedSignupConfigId: company.whatsappEmbeddedSignupConfigId,
            whatsappAppId: company.whatsappAppId,
            whatsappAppSecret: this.maskOptionalSecret(company.whatsappAppSecret, secretKey),
            hasMetaPageAccessToken: Boolean(company.metaPageAccessToken),
            hasMetaAppSecret: Boolean(company.metaAppSecret),
            hasApifyApiToken: Boolean(company.apifyApiToken),
            hasWhatsappApiToken: Boolean(company.whatsappApiToken),
            hasWhatsappVerifyToken: Boolean(company.whatsappVerifyToken),
            hasWhatsappAppSecret: Boolean(company.whatsappAppSecret),
            whatsappConfigured: Boolean(company.whatsappApiToken && company.whatsappPhoneNumberId),
            whatsappWebhookUrl: this.buildWhatsappWebhookUrl(),
            updatedAt: company.updatedAt.toISOString(),
        };
    }
    toWhatsappCredentials(company) {
        const secretKey = this.getSecretKey();
        return {
            companyId: company.id,
            accessToken: this.decryptOptionalSecret(company.whatsappApiToken, secretKey),
            phoneNumberId: company.whatsappPhoneNumberId,
            businessAccountId: company.whatsappBusinessAccountId,
            verifyToken: this.decryptOptionalSecret(company.whatsappVerifyToken, secretKey),
            metaAppSecret: this.decryptOptionalSecret(company.whatsappAppSecret ?? null, secretKey) ||
                this.decryptOptionalSecret(company.metaAppSecret, secretKey),
        };
    }
    buildWhatsappWebhookUrl() {
        const base = this.config.get('APP_URL')?.trim().replace(/\/$/, '') ||
            this.config.get('TWILIO_WEBHOOK_BASE_URL')?.trim().replace(/\/$/, '') ||
            '';
        if (!base)
            return null;
        return `${base}/whatsapp/webhook`;
    }
    maskOptionalSecret(value, secretKey) {
        if (!value)
            return null;
        try {
            return (0, secret_crypto_1.maskSecretValue)((0, secret_crypto_1.decryptSecret)(value, secretKey));
        }
        catch {
            return exports.MASKED_SECRET;
        }
    }
    decryptOptionalSecret(value, secretKey) {
        if (!value)
            return null;
        try {
            return (0, secret_crypto_1.decryptSecret)(value, secretKey);
        }
        catch {
            return null;
        }
    }
    normalizeOptionalString(value) {
        if (value === null)
            return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    normalizeSecretInput(value, secretKey) {
        if (value === null)
            return null;
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        return (0, secret_crypto_1.encryptSecret)(trimmed, secretKey);
    }
    getSecretKey() {
        return (this.config.get('TENANT_SECRETS_KEY')?.trim() ||
            this.config.getOrThrow('JWT_ACCESS_SECRET'));
    }
};
exports.CompanySettingsService = CompanySettingsService;
exports.CompanySettingsService = CompanySettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CompanySettingsService);
//# sourceMappingURL=company-settings.service.js.map