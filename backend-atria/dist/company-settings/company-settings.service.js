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
const tenant_context_1 = require("../tenancy/domain/tenant-context");
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
        const tenantId = (0, tenant_context_1.getCurrentTenantId)();
        if (tenantId) {
            const company = await this.prisma.company.findFirst({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'asc' },
            });
            if (!company) {
                throw new common_1.NotFoundException('Company not found');
            }
            return company;
        }
        const byDefault = await this.prisma.company.findUnique({
            where: { id: company_constants_1.DEFAULT_COMPANY_ID },
        });
        if (byDefault) {
            return byDefault;
        }
        const company = await this.prisma.company.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
        });
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
            hasMetaPageAccessToken: Boolean(company.metaPageAccessToken),
            hasMetaAppSecret: Boolean(company.metaAppSecret),
            hasApifyApiToken: Boolean(company.apifyApiToken),
            hasWhatsappApiToken: Boolean(company.whatsappApiToken),
            updatedAt: company.updatedAt.toISOString(),
        };
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