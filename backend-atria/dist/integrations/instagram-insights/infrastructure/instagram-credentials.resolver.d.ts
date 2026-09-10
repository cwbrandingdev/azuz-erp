import { ConfigService } from '@nestjs/config';
import { CompanySettingsService } from '../../../company-settings/company-settings.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { InstagramGraphClient } from './instagram-graph.client';
export interface ResolvedInstagramCredentials {
    clientId: string;
    companyName: string;
    avatarUrl: string | null;
    instagram: string | null;
    instagramUserId: string;
    accessToken: string;
    hasMetaAccessToken: boolean;
}
export declare class InstagramCredentialsResolver {
    private readonly prisma;
    private readonly config;
    private readonly companySettings;
    private readonly graph;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, companySettings: CompanySettingsService, graph: InstagramGraphClient);
    listConnectedClients(): Promise<{
        id: string;
        companyName: string;
        avatarUrl: string | null;
        instagram: string | null;
        instagramUserId: string | null;
        hasMetaAccessToken: boolean;
    }[]>;
    syncFromMeta(): Promise<void>;
    resolveForClient(clientId: string): Promise<ResolvedInstagramCredentials>;
    private upsertClientFromInstagram;
    private findMatchingClient;
    private resolveTenantAccessToken;
    private resolveCompanyToken;
    private decrypt;
}
