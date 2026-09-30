import { MetaPublishStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { type TaskPublishReadiness } from './domain/meta-publish-readiness';
import { MetaPublishingSyncService } from './meta-publishing.sync.service';
export type MetaPublishResult = {
    postId: string;
    metaPublishStatus: MetaPublishStatus;
    metaIgPermalink: string | null;
    metaPublishError: string | null;
};
export declare class MetaPublishingService {
    private readonly prisma;
    private readonly graph;
    private readonly credentials;
    private readonly sync;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, graph: InstagramGraphClient, credentials: InstagramCredentialsResolver, sync: MetaPublishingSyncService, notifications: NotificationsService);
    tryScheduleForTask(taskId: string): Promise<void>;
    tryScheduleForContentPost(postId: string, context?: {
        publicationDate?: Date | null;
        caption?: string;
        taskAssets?: Array<{
            fileUrl: string;
            fileType: string;
        }>;
        post?: Prisma.ContentPostGetPayload<{
            include: {
                attachments: true;
            };
        }>;
        clientId?: string | null;
    }): Promise<void>;
    publishNowForContentPost(postId: string): Promise<MetaPublishResult>;
    handlePublicationDateChange(taskId: string): Promise<void>;
    cancelScheduleForContentPost(postId: string): Promise<void>;
    private runPublish;
    getTaskPublishReadiness(taskId: string): Promise<TaskPublishReadiness>;
    retryPublishForTask(taskId: string): Promise<void>;
    refreshPublishStatusForTask(taskId: string): Promise<boolean>;
    private resolveCaption;
    private resolveMediaItems;
    private isSupportedMime;
    private createMediaContainer;
    private isImage;
    private isVideo;
    private waitForContainerIfNeeded;
    private markFailed;
    private notifyAssigneesForPost;
    private probePublicMediaUrl;
    private sleep;
}
