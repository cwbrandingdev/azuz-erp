import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostPublishStatus,
  ContentPostStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { InstagramPublishMediaResolver } from './instagram-publish-media.resolver';

const MAX_PUBLISH_ATTEMPTS = 3;
const CONTAINER_POLL_ATTEMPTS = 12;
const CONTAINER_POLL_MS = 2_500;

// #region agent log
function agentDebug(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  fetch('http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'ff56e0',
    },
    body: JSON.stringify({
      sessionId: 'ff56e0',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: 'post-fix',
    }),
  }).catch(() => {});
}
// #endregion

const postInclude = {
  attachments: { orderBy: { createdAt: 'asc' as const } },
  client: {
    select: {
      id: true,
      companyName: true,
      instagram: true,
      instagramUserId: true,
    },
  },
};

@Injectable()
export class InstagramPublishingService {
  private readonly logger = new Logger(InstagramPublishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: InstagramCredentialsResolver,
    private readonly graph: InstagramGraphClient,
    private readonly mediaResolver: InstagramPublishMediaResolver,
  ) {}

  async syncPublishQueue(postId: string) {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      include: { attachments: true },
    });
    if (!post) {
      return;
    }

    const shouldQueue = this.shouldQueueForPublish(post);
    if (!shouldQueue) {
      if (
        post.publishStatus === ContentPostPublishStatus.QUEUED &&
        !post.publishToInstagram
      ) {
        await this.prisma.contentPost.update({
          where: { id: postId },
          data: {
            publishStatus: ContentPostPublishStatus.NONE,
            publishError: null,
          },
        });
      }
      return;
    }

    if (post.publishStatus === ContentPostPublishStatus.PUBLISHED) {
      return;
    }

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        publishStatus: ContentPostPublishStatus.QUEUED,
        publishError: null,
      },
    });
  }

  async publishNow(postId: string) {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      include: postInclude,
    });
    if (!post) {
      throw new NotFoundException('Content post not found');
    }

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        publishToInstagram: true,
        scheduledDate: new Date(),
        publishStatus: ContentPostPublishStatus.QUEUED,
        publishError: null,
      },
    });

    await this.publishDuePost(postId);
  }

  async processDuePosts(limit = 10) {
    const now = new Date();
    const due = await this.prisma.contentPost.findMany({
      where: {
        publishToInstagram: true,
        publishStatus: ContentPostPublishStatus.QUEUED,
        platform: ContentPlatform.INSTAGRAM,
        scheduledDate: { lte: now },
        publishAttempts: { lt: MAX_PUBLISH_ATTEMPTS },
      },
      orderBy: { scheduledDate: 'asc' },
      take: limit,
      select: { id: true },
    });

    for (const row of due) {
      try {
        await this.publishDuePost(row.id);
      } catch (error) {
        this.logger.warn(
          `Failed to publish post ${row.id}: ${String(error)}`,
        );
      }
    }
  }

  private async publishDuePost(postId: string) {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      include: postInclude,
    });
    if (!post) {
      return;
    }

    const validationError = this.validateForPublish(post);
    if (validationError) {
      await this.markFailed(postId, validationError);
      return;
    }

    const locked = await this.prisma.contentPost.updateMany({
      where: {
        id: postId,
        publishStatus: {
          in: [
            ContentPostPublishStatus.QUEUED,
            ContentPostPublishStatus.FAILED,
          ],
        },
      },
      data: {
        publishStatus: ContentPostPublishStatus.PUBLISHING,
        lastPublishAttemptAt: new Date(),
        publishAttempts: { increment: 1 },
      },
    });

    if (locked.count === 0) {
      return;
    }

    try {
      const credentials = await this.credentials.resolveForClientPublishing(
        post.clientId,
      );
      const attachment = post.attachments[0];
      const imageUrl = await this.mediaResolver.resolvePublicImageUrl(
        attachment.url,
        post.id,
      );

      // #region agent log
      let pageAccounts: Array<{
        pageId: string;
        pageName: string;
        igId: string | null;
        igUsername: string | null;
      }> = [];
      let igProfileOk = false;
      let igProfileError: string | null = null;
      try {
        const pages = await this.graph.listPages(credentials.accessToken);
        pageAccounts = pages.map((page) => ({
          pageId: page.id,
          pageName: page.name ?? '',
          igId: page.instagram_business_account?.id ?? null,
          igUsername: page.instagram_business_account?.username ?? null,
        }));
        const storedId = credentials.instagramUserId;
        const matchesPageId = pageAccounts.some((p) => p.pageId === storedId);
        const matchesIgId = pageAccounts.some((p) => p.igId === storedId);
        try {
          await this.graph.getUserProfile(
            storedId,
            credentials.accessToken,
          );
          igProfileOk = true;
        } catch (profileErr) {
          igProfileError =
            profileErr instanceof Error
              ? profileErr.message
              : String(profileErr);
        }
        agentDebug(
          'instagram-publishing.service.ts:publishDuePost',
          'meta token page/ig probe before createImageMedia',
          {
            postId,
            clientId: post.clientId,
            storedInstagramUserId: storedId,
            resolvedInstagramUserId: credentials.instagramUserId,
            tokenSource: credentials.hasMetaAccessToken
              ? 'client'
              : 'company_or_env',
            clientInstagramHandle: post.client.instagram,
            matchesPageId,
            matchesIgId,
            igProfileOk,
            igProfileError,
            pageAccounts,
            imageUrlHost: (() => {
              try {
                return new URL(imageUrl).host;
              } catch {
                return 'invalid-url';
              }
            })(),
          },
          matchesPageId && !matchesIgId ? 'A' : 'B',
        );
      } catch (probeErr) {
        agentDebug(
          'instagram-publishing.service.ts:publishDuePost',
          'meta listPages probe failed',
          {
            postId,
            clientId: post.clientId,
            storedInstagramUserId: credentials.instagramUserId,
            probeError:
              probeErr instanceof Error ? probeErr.message : String(probeErr),
          },
          'C',
        );
      }
      // #endregion

      const container = await this.graph.createImageMedia(
        credentials.instagramUserId,
        credentials.accessToken,
        { imageUrl, caption: post.copy },
      );

      await this.waitForContainerReady(
        container.id,
        credentials.accessToken,
      );

      const published = await this.graph.publishMediaContainer(
        credentials.instagramUserId,
        credentials.accessToken,
        container.id,
      );

      const permalink = await this.tryResolvePermalink(
        published.id,
        credentials.accessToken,
      );

      await this.prisma.contentPost.update({
        where: { id: postId },
        data: {
          publishStatus: ContentPostPublishStatus.PUBLISHED,
          status: ContentPostStatus.PUBLISHED,
          publishedAt: new Date(),
          instagramMediaId: published.id,
          instagramPermalink: permalink,
          publishError: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
      // #region agent log
      agentDebug(
        'instagram-publishing.service.ts:publishDuePost',
        'createImageMedia or publish failed',
        {
          postId,
          clientId: post.clientId,
          storedInstagramUserId: post.client.instagramUserId,
          errorMessage: message,
        },
        'E',
      );
      // #endregion
      const attempts = post.publishAttempts + 1;
      const finalFailed = attempts >= MAX_PUBLISH_ATTEMPTS;

      await this.prisma.contentPost.update({
        where: { id: postId },
        data: {
          publishStatus: finalFailed
            ? ContentPostPublishStatus.FAILED
            : ContentPostPublishStatus.QUEUED,
          publishError: message.slice(0, 2000),
        },
      });
    }
  }

  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
  ) {
    for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt += 1) {
      const status = await this.graph.getMediaContainerStatus(
        containerId,
        accessToken,
      );
      const code = status.status_code?.toUpperCase();
      if (!code || code === 'FINISHED') {
        return;
      }
      if (code === 'ERROR' || code === 'EXPIRED') {
        throw new Error(
          `Container de mídia do Instagram em estado ${code}`,
        );
      }
      await this.delay(CONTAINER_POLL_MS);
    }
  }

  private async tryResolvePermalink(
    mediaId: string,
    accessToken: string,
  ): Promise<string | null> {
    try {
      const row = await this.graph.getMediaById(mediaId, accessToken);
      return row.permalink ?? null;
    } catch {
      return null;
    }
  }

  private shouldQueueForPublish(
    post: Prisma.ContentPostGetPayload<{ include: { attachments: true } }>,
  ): boolean {
    if (!post.publishToInstagram) return false;
    if (post.platform !== ContentPlatform.INSTAGRAM) return false;
    if (!post.scheduledDate) return false;
    if (post.attachments.length < 1) return false;
    if (
      post.status !== ContentPostStatus.SCHEDULED &&
      post.status !== ContentPostStatus.APPROVED
    ) {
      return false;
    }
    if (post.format !== ContentPostFormat.STATIC) return false;
    return true;
  }

  private validateForPublish(
    post: Prisma.ContentPostGetPayload<{ include: typeof postInclude }>,
  ): string | null {
    if (!post.publishToInstagram) {
      return 'Publicação no Instagram não está habilitada para este post';
    }
    if (post.platform !== ContentPlatform.INSTAGRAM) {
      return 'Plataforma precisa ser Instagram';
    }
    if (!post.scheduledDate) {
      return 'Data de publicação não definida';
    }
    if (post.attachments.length < 1) {
      return 'Anexe pelo menos uma imagem antes de publicar';
    }
    if (post.format !== ContentPostFormat.STATIC) {
      return 'Publicação automática disponível apenas para posts estáticos (imagem) no momento';
    }
    if (
      post.status !== ContentPostStatus.SCHEDULED &&
      post.status !== ContentPostStatus.APPROVED
    ) {
      return 'Post precisa estar aprovado ou agendado';
    }
    if (!post.copy?.trim()) {
      return 'Legenda (copy) é obrigatória';
    }
    return null;
  }

  private async markFailed(postId: string, message: string) {
    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        publishStatus: ContentPostPublishStatus.FAILED,
        publishError: message.slice(0, 2000),
      },
    });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
