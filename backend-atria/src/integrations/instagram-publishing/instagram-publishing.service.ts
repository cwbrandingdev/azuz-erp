import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostPublishStatus,
  ContentPostStatus,
  Prisma,
} from '@prisma/client';
import { CompanySettingsService } from '../../company-settings/company-settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { InstagramPublishMediaResolver } from './instagram-publish-media.resolver';

const MAX_PUBLISH_ATTEMPTS = 3;
/** Status polls while Meta processes the image container (each poll = 1 Graph call). */
const CONTAINER_POLL_ATTEMPTS = 5;
const CONTAINER_POLL_MS = 3_000;
const META_RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;

function isMetaRateLimitMessage(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }
  return (
    /request limit reached/i.test(message) ||
    /rate limit/i.test(message) ||
    /Limite de requisições/i.test(message)
  );
}

function metaRateLimitCooldownRemainingMs(
  lastAttemptAt: Date | null | undefined,
): number {
  if (!lastAttemptAt) {
    return 0;
  }
  const elapsed = Date.now() - lastAttemptAt.getTime();
  return Math.max(0, META_RATE_LIMIT_COOLDOWN_MS - elapsed);
}

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
    private readonly companySettings: CompanySettingsService,
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

    if (
      isMetaRateLimitMessage(post.publishError) &&
      metaRateLimitCooldownRemainingMs(post.lastPublishAttemptAt) > 0
    ) {
      const waitMin = Math.ceil(
        metaRateLimitCooldownRemainingMs(post.lastPublishAttemptAt) / 60_000,
      );
      const message = `Limite da Meta ainda ativo. Aguarde cerca de ${waitMin} min antes de tentar novamente (evita prolongar o bloqueio).`;
      throw new BadRequestException(message);
    }

    const meta = await this.companySettings.getMetaCredentialsForCurrentTenant();
    if (!meta.metaAppId?.trim() || !meta.metaAppSecret?.trim()) {
      throw new BadRequestException(
        'Configure Meta App ID e App Secret em Configurações → Integrações de API antes de publicar (necessário para validar permissões do token).',
      );
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

      await this.prisma.contentPost.update({
        where: { id: postId },
        data: {
          publishStatus: ContentPostPublishStatus.PUBLISHED,
          status: ContentPostStatus.PUBLISHED,
          publishedAt: new Date(),
          instagramMediaId: published.id,
          instagramPermalink: null,
          publishError: null,
        },
      });
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
      const isPermission10 = rawMessage.includes('instagram_content_publish');
      const isRateLimit = /request limit reached/i.test(rawMessage);
      const isTokenExpired = error instanceof Error && error.name === 'MetaTokenExpiredError';
      const message = isPermission10
        ? 'O token da Meta não tem permissão instagram_content_publish. Gere um token de Página no Graph API Explorer com instagram_content_publish (e pages_show_list), converta em Integrações de API e salve. Cadastre também App ID e App Secret da Meta nas integrações.'
        : isRateLimit
          ? 'Limite de requisições do app na Meta (rate limit). Aguarde 30–60 minutos e tente publicar uma única vez. Evite vários cliques seguidos em Publicar.'
          : isTokenExpired
            ? 'O token de acesso da Página (Meta) em Configurações → Integrações de API expirou. Gere um novo no Graph API Explorer, converta para token de Página, salve e tente novamente.'
            : rawMessage;
      const attempts = post.publishAttempts + 1;
      const finalFailed =
        isRateLimit || attempts >= MAX_PUBLISH_ATTEMPTS;

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
