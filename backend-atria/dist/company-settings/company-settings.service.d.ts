import { ConfigService } from '@nestjs/config';
import { MetaPageAccessTokenResolver } from '../integrations/instagram-insights/infrastructure/meta-page-access-token.resolver';
import { ResolveMetaPageAccessTokenDto } from './dto/resolve-meta-page-access-token.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyIntegrationsDto } from './dto/update-company-integrations.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
export declare const MASKED_SECRET = "********";
export interface CompanySettingsResponse {
    id: string;
    name: string;
    subdomain: string;
    hasCrmModuleEnabled: boolean;
    metaAdAccountId: string | null;
    metaAppId: string | null;
    metaPageAccessToken: string | null;
    metaAppSecret: string | null;
    hasMetaPageAccessToken: boolean;
    hasMetaAppSecret: boolean;
    updatedAt: string;
}
export interface CompanyIntegrationsResponse {
    metaAdAccountId: string | null;
    metaAppId: string | null;
    metaPageAccessToken: string | null;
    metaAppSecret: string | null;
    apifyApiToken: string | null;
    whatsappApiToken: string | null;
    hasMetaPageAccessToken: boolean;
    hasMetaAppSecret: boolean;
    hasApifyApiToken: boolean;
    hasWhatsappApiToken: boolean;
    updatedAt: string;
}
export interface CompanyMetaCredentials {
    metaAdAccountId: string | null;
    metaPageAccessToken: string | null;
    metaAppId: string | null;
    metaAppSecret: string | null;
}
export interface CompanyScraperCredentials {
    apifyApiToken: string | null;
}
export interface CompanyIntegrationCredentials {
    metaAdAccountId: string | null;
    metaPageAccessToken: string | null;
    metaAppId: string | null;
    metaAppSecret: string | null;
    apifyApiToken: string | null;
    whatsappApiToken: string | null;
}
export declare class CompanySettingsService {
    private readonly prisma;
    private readonly config;
    private readonly metaPageAccessTokenResolver;
    constructor(prisma: PrismaService, config: ConfigService, metaPageAccessTokenResolver: MetaPageAccessTokenResolver);
    resolveMetaPageAccessToken(dto: ResolveMetaPageAccessTokenDto): Promise<import("../integrations/instagram-insights/infrastructure/meta-page-access-token.resolver").MetaPageAccessTokenResolveResult>;
    getSettings(): Promise<CompanySettingsResponse>;
    updateSettings(dto: UpdateCompanySettingsDto): Promise<CompanySettingsResponse>;
    getIntegrations(): Promise<CompanyIntegrationsResponse>;
    updateIntegrations(dto: UpdateCompanyIntegrationsDto): Promise<CompanyIntegrationsResponse>;
    getMetaCredentialsForCurrentTenant(): Promise<CompanyMetaCredentials>;
    getScraperCredentialsForCurrentTenant(): Promise<CompanyScraperCredentials>;
    getIntegrationCredentialsForCurrentTenant(): Promise<CompanyIntegrationCredentials>;
    private loadCurrentCompany;
    private updateCompany;
    private toSettingsResponse;
    private toIntegrationsResponse;
    private maskOptionalSecret;
    private decryptOptionalSecret;
    private normalizeOptionalString;
    private normalizeSecretInput;
    private normalizeMetaPageAccessTokenInput;
    private getSecretKey;
}
