import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
export declare class MetaPublishingSyncService {
    private readonly prisma;
    private readonly graph;
    private readonly credentials;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, graph: InstagramGraphClient, credentials: InstagramCredentialsResolver, notifications: NotificationsService);
    syncScheduledPublications(): Promise<void>;
    syncPostByContentPostId(postId: string): Promise<boolean>;
    private syncOnePost;
}
