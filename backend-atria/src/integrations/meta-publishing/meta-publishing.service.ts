import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ContentPlatform,
  ContentPostFormat,
  ContentPostStatus,
  MetaPublishStatus,
  Prisma,
} from '@prisma/client';
import { contentTypeToPostFormat } from '../../kanban/kanban-content-type';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import {
  evaluateTaskPublishReadiness,
  humanizeMetaPublishError,
  type TaskPublishReadiness,
} from './domain/meta-publish-readiness';
import { resolveMetaPublishAt } from './domain/meta-schedule';
import { MetaPublishingSyncService } from './meta-publishing.sync.service';

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
    private readonly sync: MetaPublishingSyncService,
    private readonly notifications: NotificationsService,
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

    const clientId = context?.clientId ?? post.clientId ?? task?.clientId;
    if (!clientId) {
      return;
    }

    const caption =
      context?.caption?.trim() ||
      task?.postCaption?.trim() ||
      post.copy?.trim() ||
      '';

    const media = this.resolveMediaItems(
      post.attachments,
      context?.taskAssets ?? task?.assets ?? [],
    );

    if (media.length === 0) {
      await this.markFailed(
        postId,
        'Nenhuma mídia compatível para publicar no Instagram',
      );
      return;
    }

    const isStory = post.format === ContentPostFormat.STORY;
    const schedule = resolveMetaPublishAt(publicationDate);

    if (isStory && schedule.publishAtUnix != null) {
      await this.markFailed(
        postId,
        'Stories não podem ser agendados no Instagram. Use uma data no passado/imediata ou o botão Publicar agora.',
      );
      return;
    }

    if (!isStory && schedule.error) {
      await this.markFailed(postId, schedule.error);
      return;
    }

    const publishAtUnix = isStory ? null : schedule.publishAtUnix;

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaPublishStatus: MetaPublishStatus.PENDING,
        metaPublishError: null,
        scheduledDate: publicationDate,
      },
    });

    try {
      await this.runPublish({
        postId,
        clientId,
        format: post.format,
        media,
        caption,
        publicationDate,
        publishAtUnix,
      });
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : 'Falha ao agendar no Instagram';
      this.logger.warn(`Meta schedule failed for post ${postId}: ${raw}`);
      await this.markFailed(postId, raw);
    }
  }

  async publishNowForContentPost(postId: string): Promise<MetaPublishResult> {
    const post = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      include: { attachments: true },
    });

    if (!post) {
      throw new BadRequestException('Post não encontrado');
    }

    if (post.platform !== ContentPlatform.INSTAGRAM) {
      throw new BadRequestException('Apenas posts Instagram podem ser publicados');
    }

    if (!post.clientId) {
      throw new BadRequestException('Cliente não vinculado ao post');
    }

    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId: postId, deletedAt: null },
      include: { assets: { orderBy: { uploadedAt: 'asc' } } },
    });

    const media = this.resolveMediaItems(post.attachments, task?.assets ?? []);
    if (media.length === 0) {
      throw new BadRequestException(
        'Nenhuma mídia compatível para publicar no Instagram',
      );
    }

    const caption =
      task?.postCaption?.trim() || post.copy?.trim() || '';

    if (
      post.metaPublishStatus === MetaPublishStatus.SCHEDULED ||
      post.metaPublishStatus === MetaPublishStatus.PENDING
    ) {
      await this.cancelScheduleForContentPost(postId);
    }

    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaPublishStatus: MetaPublishStatus.PENDING,
        metaPublishError: null,
      },
    });

    try {
      await this.runPublish({
        postId,
        clientId: post.clientId,
        format: post.format,
        media,
        caption,
        publicationDate: new Date(),
        publishAtUnix: null,
      });
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : 'Falha ao publicar no Instagram';
      const message = humanizeMetaPublishError(raw);
      await this.markFailed(postId, raw);
      throw new BadRequestException(message);
    }

    const updated = await this.prisma.contentPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        metaPublishStatus: true,
        metaIgPermalink: true,
        metaPublishError: true,
      },
    });

    return {
      postId,
      metaPublishStatus:
        updated?.metaPublishStatus ?? MetaPublishStatus.FAILED,
      metaIgPermalink: updated?.metaIgPermalink ?? null,
      metaPublishError: updated?.metaPublishError ?? null,
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

    if (
      post.metaIgMediaId &&
      post.metaPublishStatus === MetaPublishStatus.SCHEDULED &&
      post.clientId
    ) {
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

  private async runPublish(input: {
    postId: string;
    clientId: string;
    format: ContentPostFormat;
    media: Array<{ url: string; mimeType: string }>;
    caption: string;
    publicationDate: Date;
    publishAtUnix: number | null;
  }) {
    const creds = await this.credentials.resolveForClient(input.clientId);
    const creationId = await this.createMediaContainer(
      creds.instagramUserId,
      creds.accessToken,
      input.format,
      input.media,
      input.caption,
    );

    await this.waitForContainerIfNeeded(creationId, creds.accessToken);

    const published = await this.graph.publishMediaContainer(
      creds.instagramUserId,
      creds.accessToken,
      {
        creationId,
        publishAtUnix: input.publishAtUnix,
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

    const scheduled = input.publishAtUnix != null;

    await this.prisma.contentPost.update({
      where: { id: input.postId },
      data: {
        metaIgContainerId: creationId,
        metaIgMediaId: published.id,
        metaPublishStatus: scheduled
          ? MetaPublishStatus.SCHEDULED
          : MetaPublishStatus.PUBLISHED,
        metaPublishError: null,
        metaScheduledAt: scheduled ? input.publicationDate : null,
        metaPublishedAt: scheduled ? null : new Date(),
        metaIgPermalink: permalink,
        scheduledDate: input.publicationDate,
        status: scheduled
          ? ContentPostStatus.SCHEDULED
          : ContentPostStatus.PUBLISHED,
      },
    });

    if (!scheduled) {
      await this.notifyAssigneesForPost(input.postId, true);
    }
  }

  async getTaskPublishReadiness(taskId: string): Promise<TaskPublishReadiness> {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assets: { orderBy: { uploadedAt: 'asc' } },
        contentPost: { include: { attachments: true } },
        client: {
          select: {
            id: true,
            instagramUserId: true,
            metaAccessToken: true,
          },
        },
      },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    const format = task.contentPost
      ? task.contentPost.format
      : contentTypeToPostFormat(task.contentType);

    const media = this.resolveMediaItems(
      task.contentPost?.attachments ?? [],
      task.assets,
    );
    const images = media.filter((m) => this.isImage(m.mimeType, m.url));
    const videos = media.filter((m) => this.isVideo(m.mimeType, m.url));

    let clientHasInstagram = Boolean(task.client?.instagramUserId?.trim());
    let clientHasMetaToken = Boolean(task.client?.metaAccessToken);
    if (task.clientId) {
      try {
        await this.credentials.resolveForClient(task.clientId);
        clientHasInstagram = true;
        clientHasMetaToken = true;
      } catch {
        if (!task.client?.instagramUserId?.trim()) {
          clientHasInstagram = false;
        }
        if (!task.client?.metaAccessToken) {
          clientHasMetaToken = false;
        }
      }
    }

    const firstUrl = media[0]?.url;
    const mediaUrlReachable =
      firstUrl && firstUrl.toLowerCase().startsWith('https://')
        ? await this.probePublicMediaUrl(firstUrl)
        : null;

    return evaluateTaskPublishReadiness({
      clientId: task.clientId,
      clientHasInstagram,
      clientHasMetaToken,
      publicationDate: task.publicationDate,
      format,
      media,
      imageCount: images.length,
      videoCount: videos.length,
      mediaUrlReachable,
    });
  }

  async retryPublishForTask(taskId: string): Promise<void> {
    const readiness = await this.getTaskPublishReadiness(taskId);
    if (!readiness.ready) {
      const first = readiness.blockers[0]?.message ?? 'Publicação não está pronta';
      throw new BadRequestException(first);
    }

    const task = await this.prisma.kanbanTask.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { contentPostId: true, status: true },
    });
    if (!task?.contentPostId) {
      throw new BadRequestException('Tarefa sem post de conteúdo vinculado');
    }

    await this.cancelScheduleForContentPost(task.contentPostId);
    await this.prisma.contentPost.update({
      where: { id: task.contentPostId },
      data: {
        metaPublishStatus: MetaPublishStatus.NOT_SCHEDULED,
        metaPublishError: null,
      },
    });

    await this.tryScheduleForTask(taskId);
  }

  async refreshPublishStatusForTask(taskId: string): Promise<boolean> {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { contentPostId: true },
    });
    if (!task?.contentPostId) {
      return false;
    }
    const post = await this.prisma.contentPost.findUnique({
      where: { id: task.contentPostId },
      select: { metaPublishStatus: true },
    });
    if (post?.metaPublishStatus !== MetaPublishStatus.SCHEDULED) {
      return post?.metaPublishStatus === MetaPublishStatus.PUBLISHED;
    }
    return this.sync.syncPostByContentPostId(task.contentPostId);
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

    if (format === ContentPostFormat.STORY) {
      if (videos.length > 0) {
        const created = await this.graph.createStoryMediaContainer(
          igUserId,
          accessToken,
          { videoUrl: videos[0].url },
        );
        return created.id;
      }
      if (images.length === 0) {
        throw new Error('Story requer imagem ou vídeo');
      }
      const created = await this.graph.createStoryMediaContainer(
        igUserId,
        accessToken,
        { imageUrl: images[0].url },
      );
      return created.id;
    }

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
    const friendly = humanizeMetaPublishError(message);
    await this.prisma.contentPost.update({
      where: { id: postId },
      data: {
        metaPublishStatus: MetaPublishStatus.FAILED,
        metaPublishError: friendly,
      },
    });
    await this.notifyAssigneesForPost(postId, false, friendly);
  }

  private async notifyAssigneesForPost(
    postId: string,
    published: boolean,
    detail?: string,
  ) {
    const task = await this.prisma.kanbanTask.findFirst({
      where: { contentPostId: postId, deletedAt: null },
      select: { id: true, title: true, companyId: true },
    });
    if (!task) {
      return;
    }
    await this.notifications.notifyMetaInstagramPublish({
      companyId: task.companyId,
      taskId: task.id,
      taskTitle: task.title,
      published,
      detail,
    });
  }

  private async probePublicMediaUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (response.ok) {
        return true;
      }
      if (response.status === 405 || response.status === 403) {
        const getResponse = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(5_000),
          headers: { Range: 'bytes=0-0' },
        });
        return getResponse.ok;
      }
      return false;
    } catch {
      return false;
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
