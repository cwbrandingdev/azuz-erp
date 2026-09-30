import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostStatus,
  MetaPublishStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { resolveMetaPublishAt } from './domain/meta-schedule';

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime']);

export type MetaPublishResult = {
  postId: string;
  metaPublishStatus: MetaPublishStatus;
  metaIgPermalink: string | null;
  metaPublishError: string | null;
};

@Injectable()
export class MetaPublishingService {
  private readonly logger = new Logger(MetaPublishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: InstagramGraphClient,
    private readonly credentials: InstagramCredentialsResolver,
  ) {}

  async tryScheduleForTask(taskId: string): Promise<void> {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assets: { orderBy: { uploadedAt: 'asc' } },
        contentPost: { include: { attachments: true } },
      },
    });

    if (!task?.contentPostId || !task.contentPost) {
      return;
    }

    await this.tryScheduleForContentPost(task.contentPostId, {
      publicationDate: task.publicationDate,
      caption: this.resolveCaption(task),
      taskAssets: task.assets,
      post: task.contentPost,
      clientId: task.clientId,
    });
  }

  async tryScheduleForContentPost(
    postId: string,
    context?: {
      publicationDate?: Date | null;
      caption?: string;
      taskAssets?: Array<{ fileUrl: string; fileType: string }>;
      post?: Prisma.ContentPostGetPayload<{
        include: { attachments: true };
      }>;
      clientId?: string | null;
    },
  ): Promise<void> {
    const post =
      context?.post ??
      (await this.prisma.contentPost.findUnique({
        where: { id: postId },
        include: { attachments: true },
      }));

    if (!post) {
      return;
    }

    if (post.platform !== ContentPlatform.INSTAGRAM) {
      return;
    }

    if (post.status !== ContentPostStatus.APPROVED) {
      return;
    }

    if (
      post.metaPublishStatus === MetaPublishStatus.SCHEDULED ||
      post.metaPublishStatus === MetaPublishStatus.PUBLISHED
    ) {
      return;
    }

    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId: postId, deletedAt: null },
      include: { assets: { orderBy: { uploadedAt: 'asc' } } },
    });

    const publicationDate =
      context?.publicationDate ??
      task?.publicationDate ??
      post.scheduledDate;

    if (!publicationDate) {
      return;
    }

    const schedule = resolveMetaPublishAt(publicationDate);
    if (schedule.error) {
      await this.markFailed(postId, schedule.error);
      return;
    }

    try {
      await this.runPublish({
        postId,
        post,
        taskAssets: context?.taskAssets ?? task?.assets ?? [],
        caption:
          context?.caption?.trim() ||
          task?.postCaption?.trim() ||
          post.copy?.trim() ||
          '',
        clientId: context?.clientId ?? post.clientId ?? task?.clientId,
        publishAtUnix: schedule.publishAtUnix,
        scheduledDate: publicationDate,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao agendar no Instagram';
      this.logger.warn(`Meta schedule failed for post ${postId}: ${message}`);
      await this.markFailed(postId, message);
    }
  }

  async publishNowForContentPost(postId: string): Promise<MetaPublishResult> {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      include: { attachments: true },
    });
    if (!post) {
      throw new BadRequestException('Post de conteúdo não encontrado');
    }
    if (post.platform !== ContentPlatform.INSTAGRAM) {
      throw new BadRequestException('Apenas posts Instagram podem ser publicados');
    }
    if (post.metaPublishStatus === MetaPublishStatus.PUBLISHED) {
      throw new BadRequestException('Este post já foi publicado no Instagram');
    }

    if (post.metaPublishStatus === MetaPublishStatus.SCHEDULED) {
      await this.cancelScheduleForContentPost(postId);
    }

    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId: postId, deletedAt: null },
      include: { assets: { orderBy: { uploadedAt: 'asc' } } },
    });

    const clientId = post.clientId ?? task?.clientId;
    if (!clientId) {
      throw new BadRequestException('Cliente não vinculado ao post');
    }

    const refreshed = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      include: { attachments: true },
    });
    if (!refreshed) {
      throw new BadRequestException('Post de conteúdo não encontrado');
    }

    try {
      return await this.runPublish({
        postId,
        post: refreshed,
        taskAssets: task?.assets ?? [],
        caption:
          task?.postCaption?.trim() || refreshed.copy?.trim() || '',
        clientId,
        publishAtUnix: null,
        scheduledDate: new Date(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
      await this.markFailed(postId, message);
      throw new BadRequestException(message);
    }
  }

  private async runPublish(input: {
    postId: string;
    post: Prisma.ContentPostGetPayload<{ include: { attachments: true } }>;
    taskAssets: Array<{ fileUrl: string; fileType: string }>;
    caption: string;
    clientId: string | null | undefined;
    publishAtUnix: number | null;
    scheduledDate: Date;
  }): Promise<MetaPublishResult> {
    const { postId, post, taskAssets, caption, publishAtUnix, scheduledDate } =
      input;
    const clientId = input.clientId;
    if (!clientId) {
      throw new BadRequestException('Cliente não vinculado');
    }

    const media = this.resolveMediaItems(post.attachments, taskAssets);
    if (media.length === 0) {
      throw new BadRequestException(
        'Nenhuma mídia compatível para publicar no Instagram',
      );
    }

    if (post.format === ContentPostFormat.STORY) {
      throw new BadRequestException(
        'Publicação de Stories via API não está disponível nesta versão',
      );
    }

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaPublishStatus: MetaPublishStatus.PENDING,
        metaPublishError: null,
        scheduledDate,
      },
    });

    const creds = await this.credentials.resolveForClient(clientId);
    const creationId = await this.createMediaContainer(
      creds.instagramUserId,
      creds.accessToken,
      post.format,
      media,
      caption,
    );

    await this.waitForContainerIfNeeded(creationId, creds.accessToken);

    const published = await this.graph.publishMediaContainer(
      creds.instagramUserId,
      creds.accessToken,
      {
        creationId,
        publishAtUnix,
      },
    );

    let permalink: string | null = null;
    try {
      const mediaInfo = await this.graph.getMediaPermalink(
        published.id,
        creds.accessToken,
      );
      permalink = mediaInfo.permalink ?? null;
    } catch {
      permalink = null;
    }

    const isScheduled = publishAtUnix != null;
    const updated = await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaIgContainerId: creationId,
        metaIgMediaId: published.id,
        metaPublishStatus: isScheduled
          ? MetaPublishStatus.SCHEDULED
          : MetaPublishStatus.PUBLISHED,
        metaPublishError: null,
        metaScheduledAt: isScheduled ? scheduledDate : null,
        metaIgPermalink: permalink,
        scheduledDate,
        status: isScheduled
          ? ContentPostStatus.SCHEDULED
          : ContentPostStatus.PUBLISHED,
      },
    });

    return {
      postId,
      metaPublishStatus: updated.metaPublishStatus,
      metaIgPermalink: updated.metaIgPermalink,
      metaPublishError: null,
    };
  }

  async handlePublicationDateChange(taskId: string): Promise<void> {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, contentPostId: true, publicationDate: true },
    });
    if (!task?.contentPostId) {
      return;
    }

    const post = await this.prisma.contentPost.findUnique({
      where: { id: task.contentPostId },
      select: { metaPublishStatus: true, status: true },
    });
    if (!post) {
      return;
    }

    if (task.publicationDate) {
      await this.prisma.contentPost.update({
        where: { id: task.contentPostId },
        data: { scheduledDate: task.publicationDate },
      });
    }

    if (
      post.metaPublishStatus === MetaPublishStatus.SCHEDULED ||
      post.metaPublishStatus === MetaPublishStatus.FAILED
    ) {
      await this.cancelScheduleForContentPost(task.contentPostId);
      if (post.status === ContentPostStatus.APPROVED) {
        await this.tryScheduleForTask(taskId);
      }
    }
  }

  async cancelScheduleForContentPost(postId: string): Promise<void> {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        clientId: true,
        metaIgMediaId: true,
        metaPublishStatus: true,
      },
    });
    if (!post) {
      return;
    }

    if (
      post.metaPublishStatus !== MetaPublishStatus.SCHEDULED &&
      post.metaPublishStatus !== MetaPublishStatus.FAILED &&
      post.metaPublishStatus !== MetaPublishStatus.PENDING
    ) {
      return;
    }

    if (post.metaIgMediaId && post.metaPublishStatus === MetaPublishStatus.SCHEDULED) {
      try {
        const creds = await this.credentials.resolveForClient(post.clientId);
        await this.graph.deleteMedia(post.metaIgMediaId, creds.accessToken);
      } catch (error) {
        this.logger.warn(
          `Could not delete Meta media ${post.metaIgMediaId}: ${String(error)}`,
        );
      }
    }

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaIgContainerId: null,
        metaIgMediaId: null,
        metaPublishStatus: MetaPublishStatus.NOT_SCHEDULED,
        metaPublishError: null,
        metaScheduledAt: null,
        metaIgPermalink: null,
      },
    });
  }

  private resolveCaption(task: {
    postCaption: string | null;
    contentPost: { copy: string } | null;
  }) {
    return task.postCaption?.trim() || task.contentPost?.copy?.trim() || '';
  }

  private resolveMediaItems(
    attachments: Array<{ url: string; mimeType: string | null }>,
    assets: Array<{ fileUrl: string; fileType: string }>,
  ) {
    const fromAttachments = attachments
      .map((item) => ({
        url: item.url,
        mimeType: item.mimeType ?? '',
      }))
      .filter((item) => this.isSupportedMime(item.mimeType, item.url));

    if (fromAttachments.length > 0) {
      return fromAttachments;
    }

    return assets
      .map((item) => ({
        url: item.fileUrl,
        mimeType: item.fileType,
      }))
      .filter((item) => this.isSupportedMime(item.mimeType, item.url));
  }

  private isSupportedMime(mimeType: string, url: string) {
    const normalized = mimeType.toLowerCase();
    if (IMAGE_MIME.has(normalized) || VIDEO_MIME.has(normalized)) {
      return true;
    }
    const lower = url.toLowerCase();
    return (
      /\.(jpe?g|png|webp|gif)(\?|$)/i.test(lower) ||
      /\.(mp4|mov)(\?|$)/i.test(lower)
    );
  }

  private async createMediaContainer(
    igUserId: string,
    accessToken: string,
    format: ContentPostFormat,
    media: Array<{ url: string; mimeType: string }>,
    caption: string,
  ): Promise<string> {
    const images = media.filter((item) => this.isImage(item.mimeType, item.url));
    const videos = media.filter((item) => this.isVideo(item.mimeType, item.url));

    if (format === ContentPostFormat.CAROUSEL && images.length >= 2) {
      const childIds: string[] = [];
      for (const image of images) {
        const child = await this.graph.createImageMediaContainer(
          igUserId,
          accessToken,
          { imageUrl: image.url, isCarouselItem: true },
        );
        childIds.push(child.id);
      }
      const parent = await this.graph.createCarouselMediaContainer(
        igUserId,
        accessToken,
        { children: childIds, caption },
      );
      return parent.id;
    }

    if (format === ContentPostFormat.REELS && videos.length > 0) {
      const created = await this.graph.createVideoMediaContainer(
        igUserId,
        accessToken,
        {
          videoUrl: videos[0].url,
          caption,
          mediaType: 'REELS',
        },
      );
      return created.id;
    }

    if (videos.length > 0) {
      const created = await this.graph.createVideoMediaContainer(
        igUserId,
        accessToken,
        {
          videoUrl: videos[0].url,
          caption,
          mediaType: 'VIDEO',
        },
      );
      return created.id;
    }

    if (images.length === 0) {
      throw new Error('Nenhuma imagem ou vídeo válido para publicação');
    }

    const created = await this.graph.createImageMediaContainer(
      igUserId,
      accessToken,
      { imageUrl: images[0].url, caption },
    );
    return created.id;
  }

  private isImage(mimeType: string, url: string) {
    if (IMAGE_MIME.has(mimeType.toLowerCase())) {
      return true;
    }
    return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
  }

  private isVideo(mimeType: string, url: string) {
    if (VIDEO_MIME.has(mimeType.toLowerCase())) {
      return true;
    }
    return /\.(mp4|mov)(\?|$)/i.test(url);
  }

  private async waitForContainerIfNeeded(
    containerId: string,
    accessToken: string,
  ) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const status = await this.graph.getMediaContainerStatus(
        containerId,
        accessToken,
      );
      if (status.status_code === 'FINISHED' || !status.status_code) {
        return;
      }
      if (status.status_code === 'ERROR') {
        throw new Error('O Meta não conseguiu processar a mídia');
      }
      await this.sleep(2_500);
    }
    throw new Error('Tempo esgotado aguardando processamento da mídia no Meta');
  }

  private async markFailed(postId: string, message: string) {
    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaPublishStatus: MetaPublishStatus.FAILED,
        metaPublishError: message,
      },
    });
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
