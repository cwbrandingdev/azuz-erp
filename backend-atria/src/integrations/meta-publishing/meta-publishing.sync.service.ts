import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  ContentPostStatus,
  MetaPublishStatus,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';

const SAO_PAULO_TZ = 'America/Sao_Paulo';
const GRACE_AFTER_SCHEDULE_MS = 2 * 60 * 1000;

@Injectable()
export class MetaPublishingSyncService {
  private readonly logger = new Logger(MetaPublishingSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: InstagramGraphClient,
    private readonly credentials: InstagramCredentialsResolver,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/5 * * * *', { timeZone: SAO_PAULO_TZ })
  async syncScheduledPublications(): Promise<void> {
    if (process.env.JEST_WORKER_ID) {
      return;
    }

    const now = Date.now();
    const dueBefore = new Date(now - GRACE_AFTER_SCHEDULE_MS);

    const posts = await this.prisma.contentPost.findMany({
      where: {
        metaPublishStatus: MetaPublishStatus.SCHEDULED,
        metaIgMediaId: { not: null },
        metaScheduledAt: { lte: dueBefore },
      },
      select: {
        id: true,
        clientId: true,
        metaIgMediaId: true,
        metaScheduledAt: true,
      },
      take: 50,
    });

    for (const post of posts) {
      if (!post.metaIgMediaId) {
        continue;
      }
      try {
        await this.syncOnePost(post.id, post.clientId, post.metaIgMediaId);
      } catch (error) {
        this.logger.debug(
          `Meta sync skip post ${post.id}: ${String(error)}`,
        );
      }
    }
  }

  async syncPostByContentPostId(postId: string): Promise<boolean> {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        clientId: true,
        metaIgMediaId: true,
        metaPublishStatus: true,
      },
    });
    if (
      !post?.metaIgMediaId ||
      post.metaPublishStatus !== MetaPublishStatus.SCHEDULED
    ) {
      return false;
    }
    return this.syncOnePost(post.id, post.clientId, post.metaIgMediaId);
  }

  private async syncOnePost(
    postId: string,
    clientId: string,
    mediaId: string,
  ): Promise<boolean> {
    const creds = await this.credentials.resolveForClient(clientId);
    const media = await this.graph.getInstagramMedia(mediaId, creds.accessToken);

    const publishedAt = media.timestamp
      ? new Date(media.timestamp)
      : null;

    const isLive =
      Boolean(media.permalink) ||
      (publishedAt != null && !Number.isNaN(publishedAt.getTime()));

    if (!isLive) {
      return false;
    }

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaPublishStatus: MetaPublishStatus.PUBLISHED,
        metaPublishedAt: publishedAt ?? new Date(),
        metaIgPermalink: media.permalink ?? undefined,
        metaPublishError: null,
        status: ContentPostStatus.PUBLISHED,
      },
    });

    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId: postId, deletedAt: null },
      select: { id: true, title: true, companyId: true },
    });
    if (task) {
      await this.notifications.notifyMetaInstagramPublish({
        companyId: task.companyId,
        taskId: task.id,
        taskTitle: task.title,
        published: true,
      });
    }

    return true;
  }
}
