import { CompanySettingsService } from '../../company-settings/company-settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { InstagramPublishMediaResolver } from './instagram-publish-media.resolver';
export declare class InstagramPublishingService {
    private readonly prisma;
    private readonly credentials;
    private readonly graph;
    private readonly mediaResolver;
    private readonly companySettings;
    private readonly logger;
    constructor(prisma: PrismaService, credentials: InstagramCredentialsResolver, graph: InstagramGraphClient, mediaResolver: InstagramPublishMediaResolver, companySettings: CompanySettingsService);
    syncPublishQueue(postId: string): Promise<void>;
    publishNow(postId: string): Promise<void>;
    processDuePosts(limit?: number): Promise<void>;
    private publishDuePost;
    private waitForContainerReady;
    private shouldQueueForPublish;
    private validateForPublish;
    private markFailed;
    private delay;
}
