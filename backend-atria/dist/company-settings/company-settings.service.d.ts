import { ConfigService } from '@nestjs/config';
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
    whatsappPhoneNumberId: string | null;
    whatsappBusinessAccountId: string | null;
    whatsappVerifyToken: string | null;
    whatsappEmbeddedSignupConfigId: string | null;
    whatsappAppId: string | null;
    whatsappAppSecret: string | null;
    hasMetaPageAccessToken: boolean;
    hasMetaAppSecret: boolean;
    hasApifyApiToken: boolean;
    hasWhatsappApiToken: boolean;
    hasWhatsappVerifyToken: boolean;
    hasWhatsappAppSecret: boolean;
    whatsappConfigured: boolean;
    whatsappWebhookUrl: string | null;
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
export interface CompanyWhatsappCredentials {
    companyId: string;
    accessToken: string | null;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    verifyToken: string | null;
    metaAppSecret: string | null;
}
export declare class CompanySettingsService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    getSettings(): Promise<CompanySettingsResponse>;
    updateSettings(dto: UpdateCompanySettingsDto): Promise<CompanySettingsResponse>;
    getIntegrations(): Promise<CompanyIntegrationsResponse>;
    updateIntegrations(dto: UpdateCompanyIntegrationsDto): Promise<CompanyIntegrationsResponse>;
    getMetaCredentialsForCurrentTenant(): Promise<CompanyMetaCredentials>;
    getScraperCredentialsForCurrentTenant(): Promise<CompanyScraperCredentials>;
    getWhatsappCredentialsForCurrentTenant(): Promise<CompanyWhatsappCredentials>;
    findWhatsappCredentialsByPhoneNumberId(phoneNumberId: string): Promise<CompanyWhatsappCredentials | null>;
    findWhatsappCredentialsByVerifyToken(token: string): Promise<CompanyWhatsappCredentials | null>;
    getMetaAppAuthForCurrentTenant(): Promise<{
        appId: string | null;
        appSecret: string | null;
    }>;
    getWhatsappEmbeddedSignupPublicConfig(): Promise<{
        enabled: boolean;
        appId: string | null;
        configId: string | null;
    }>;
    saveWhatsappConnection(input: {
        accessToken: string;
        phoneNumberId: string;
        businessAccountId: string | null;
    }): Promise<void>;
    getIntegrationCredentialsForCurrentTenant(): Promise<CompanyIntegrationCredentials>;
    private loadCurrentCompany;
    private updateCompany;
    private toSettingsResponse;
    private toIntegrationsResponse;
    private toWhatsappCredentials;
    private buildWhatsappWebhookUrl;
    private maskOptionalSecret;
    private decryptOptionalSecret;
    private normalizeOptionalString;
    private normalizeSecretInput;
    private getSecretKey;
}
