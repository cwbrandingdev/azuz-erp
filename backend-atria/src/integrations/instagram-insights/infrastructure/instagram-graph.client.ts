import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isMetaTokenExpired,
  MetaTokenExpiredError,
} from '../domain/meta-token-expired.error';
import type {
  GraphErrorBody,
  GraphInsightsResponse,
  GraphMediaListResponse,
  GraphMediaRow,
  GraphPageListResponse,
  GraphPageRow,
  GraphUserProfileResponse,
} from '../domain/instagram-insights.types';

const DEFAULT_GRAPH_VERSION = 'v21.0';

@Injectable()
export class InstagramGraphClient {
  constructor(private readonly config: ConfigService) {}

  async listPages(accessToken: string): Promise<GraphPageRow[]> {
    const response = await this.getJson<GraphPageListResponse>('/me/accounts', {
      fields:
        'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}',
      limit: '100',
      access_token: accessToken,
    });
    return response.data ?? [];
  }

  async getUserProfile(
    igUserId: string,
    accessToken: string,
  ): Promise<GraphUserProfileResponse> {
    return this.getJson<GraphUserProfileResponse>(
      `/${igUserId}`,
      {
        fields: 'id,username,name,profile_picture_url,followers_count',
        access_token: accessToken,
      },
    );
  }

  async getAccountInsights(
    igUserId: string,
    accessToken: string,
    metrics: string[],
    extra: Record<string, string> = {},
  ): Promise<GraphInsightsResponse> {
    return this.getJson<GraphInsightsResponse>(`/${igUserId}/insights`, {
      metric: metrics.join(','),
      access_token: accessToken,
      ...extra,
    });
  }

  async listMedia(
    igUserId: string,
    accessToken: string,
    options: { since?: number; until?: number; limit?: number } = {},
  ): Promise<GraphMediaRow[]> {
    const rows: GraphMediaRow[] = [];
    let after: string | undefined;
    const pageSize = String(options.limit ?? 50);

    for (let page = 0; page < 8; page += 1) {
      const params: Record<string, string> = {
        fields:
          'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: pageSize,
        access_token: accessToken,
      };
      if (after) {
        params.after = after;
      }

      const response = await this.getJson<GraphMediaListResponse>(
        `/${igUserId}/media`,
        params,
      );
      const data = response.data ?? [];
      if (data.length === 0) {
        break;
      }

      let reachedOlder = false;
      for (const row of data) {
        const timestamp = row.timestamp
          ? Math.floor(Date.parse(row.timestamp) / 1000)
          : null;
        if (timestamp == null || Number.isNaN(timestamp)) {
          continue;
        }
        if (options.until && timestamp >= options.until) {
          continue;
        }
        if (options.since && timestamp < options.since) {
          reachedOlder = true;
          continue;
        }
        rows.push(row);
      }

      if (reachedOlder) {
        break;
      }

      after = response.paging?.cursors?.after;
      if (!after) {
        break;
      }
    }

    return rows;
  }

  async listStories(
    igUserId: string,
    accessToken: string,
  ): Promise<GraphMediaRow[]> {
    const response = await this.getJson<GraphMediaListResponse>(
      `/${igUserId}/stories`,
      {
        fields:
          'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp',
        access_token: accessToken,
      },
    );
    return (response.data ?? []).map((item) => ({
      ...item,
      media_product_type: item.media_product_type ?? 'STORY',
      media_type: item.media_type ?? 'STORY',
    }));
  }

  async getMediaInsights(
    mediaId: string,
    accessToken: string,
    metrics: string[],
  ): Promise<GraphInsightsResponse> {
    return this.getJson<GraphInsightsResponse>(`/${mediaId}/insights`, {
      metric: metrics.join(','),
      access_token: accessToken,
    });
  }

  async createImageMediaContainer(
    igUserId: string,
    accessToken: string,
    input: { imageUrl: string; caption?: string; isCarouselItem?: boolean },
  ): Promise<{ id: string }> {
    const body: Record<string, string> = {
      image_url: input.imageUrl,
      access_token: accessToken,
    };
    if (input.caption) body.caption = input.caption;
    if (input.isCarouselItem) body.is_carousel_item = 'true';
    return this.postForm<GraphErrorBody & { id: string }>(
      `/${igUserId}/media`,
      body,
    );
  }

  async createVideoMediaContainer(
    igUserId: string,
    accessToken: string,
    input: {
      videoUrl: string;
      caption?: string;
      mediaType?: 'REELS' | 'VIDEO';
      isCarouselItem?: boolean;
    },
  ): Promise<{ id: string }> {
    const body: Record<string, string> = {
      video_url: input.videoUrl,
      access_token: accessToken,
    };
    if (input.caption) body.caption = input.caption;
    if (input.mediaType) body.media_type = input.mediaType;
    if (input.isCarouselItem) body.is_carousel_item = 'true';
    return this.postForm<GraphErrorBody & { id: string }>(
      `/${igUserId}/media`,
      body,
    );
  }

  async createStoryMediaContainer(
    igUserId: string,
    accessToken: string,
    input: { imageUrl?: string; videoUrl?: string },
  ): Promise<{ id: string }> {
    const body: Record<string, string> = {
      media_type: 'STORIES',
      access_token: accessToken,
    };
    if (input.videoUrl) body.video_url = input.videoUrl;
    else if (input.imageUrl) body.image_url = input.imageUrl;
    else throw new Error('Story requer imagem ou vídeo');
    return this.postForm<GraphErrorBody & { id: string }>(
      `/${igUserId}/media`,
      body,
    );
  }

  async createCarouselMediaContainer(
    igUserId: string,
    accessToken: string,
    input: { children: string[]; caption?: string },
  ): Promise<{ id: string }> {
    const body: Record<string, string> = {
      media_type: 'CAROUSEL',
      children: input.children.join(','),
      access_token: accessToken,
    };
    if (input.caption) body.caption = input.caption;
    return this.postForm<GraphErrorBody & { id: string }>(
      `/${igUserId}/media`,
      body,
    );
  }

  async getMediaContainerStatus(
    containerId: string,
    accessToken: string,
  ): Promise<{ status_code?: string }> {
    return this.getJson<GraphErrorBody & { status_code?: string }>(
      `/${containerId}`,
      { fields: 'status_code', access_token: accessToken },
    );
  }

  async publishMediaContainer(
    igUserId: string,
    accessToken: string,
    input: { creationId: string; publishAtUnix?: number | null },
  ): Promise<{ id: string }> {
    const body: Record<string, string> = {
      creation_id: input.creationId,
      access_token: accessToken,
    };
    if (input.publishAtUnix != null) {
      body.publish_at = String(input.publishAtUnix);
    }
    return this.postForm<GraphErrorBody & { id: string }>(
      `/${igUserId}/media_publish`,
      body,
    );
  }

  async getMediaPermalink(
    mediaId: string,
    accessToken: string,
  ): Promise<{ permalink?: string }> {
    return this.getJson<GraphErrorBody & { permalink?: string }>(`/${mediaId}`, {
      fields: 'permalink',
      access_token: accessToken,
    });
  }

  async getInstagramMedia(
    mediaId: string,
    accessToken: string,
  ): Promise<{ id?: string; permalink?: string; timestamp?: string }> {
    return this.getJson<
      GraphErrorBody & { id?: string; permalink?: string; timestamp?: string }
    >(`/${mediaId}`, {
      fields: 'id,permalink,timestamp',
      access_token: accessToken,
    });
  }

  async deleteMedia(
    mediaId: string,
    accessToken: string,
  ): Promise<{ success: boolean }> {
    return this.deleteRequest<GraphErrorBody & { success: boolean }>(
      `/${mediaId}`,
      accessToken,
    );
  }

  private async postForm<T extends GraphErrorBody>(
    path: string,
    body: Record<string, string>,
  ): Promise<T> {
    const response = await fetch(`${this.graphBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
    return this.parseGraphResponse<T>(response);
  }

  private async deleteRequest<T extends GraphErrorBody>(
    path: string,
    accessToken: string,
  ): Promise<T> {
    const url = new URL(`${this.graphBase()}${path}`);
    url.searchParams.set('access_token', accessToken);
    const response = await fetch(url, { method: 'DELETE' });
    return this.parseGraphResponse<T>(response);
  }

  private async getJson<T extends GraphErrorBody>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.graphBase()}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url);
    return this.parseGraphResponse<T>(response);
  }

  private async parseGraphResponse<T extends GraphErrorBody>(
    response: Response,
  ): Promise<T> {
    let payload: T;
    try {
      payload = (await response.json()) as T;
    } catch {
      if (response.status === 401) {
        throw new MetaTokenExpiredError();
      }
      throw new Error('Falha na API do Meta');
    }

    const graphError = payload.error;
    if (graphError) {
      if (isMetaTokenExpired(graphError) || response.status === 401) {
        throw new MetaTokenExpiredError();
      }
      throw new Error(graphError.message ?? 'Falha na API do Meta');
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new MetaTokenExpiredError();
      }
      throw new Error('Falha na API do Meta');
    }

    return payload;
  }

  private graphBase() {
    const version =
      this.config.get<string>('META_API_VERSION')?.trim() ||
      DEFAULT_GRAPH_VERSION;
    return `https://graph.facebook.com/${version.replace(/^\/+/, '')}`;
  }
}
