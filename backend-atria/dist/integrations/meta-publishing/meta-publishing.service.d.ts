import { MetaPublishStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
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
    private readonly logger;
    constructor(prisma: PrismaService, graph: InstagramGraphClient, credentials: InstagramCredentialsResolver);
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
    private runPublish;
    handlePublicationDateChange(taskId: string): Promise<void>;
    cancelScheduleForContentPost(postId: string): Promise<void>;
    private resolveCaption;
    private resolveMediaItems;
    private isSupportedMime;
    private createMediaContainer;
    private isImage;
    private isVideo;
    private waitForContainerIfNeeded;
    private markFailed;
    private sleep;
}
