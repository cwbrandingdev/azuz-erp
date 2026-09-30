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
  GraphDebugTokenResponse,
  GraphInstagramBusinessAccount,
  GraphPageListResponse,
  GraphPageRow,
  GraphUserProfileResponse,
} from '../domain/instagram-insights.types';

const DEFAULT_GRAPH_VERSION = 'v21.0';

@Injectable()
export class InstagramGraphClient {
  constructor(private readonly config: ConfigService) {}

  async listPages(accessToken: string): Promise<GraphPageRow[]> {
    try {
      const response = await this.getJson<GraphPageListResponse>(
        '/me/accounts',
        {
          fields:
            'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}',
          limit: '100',
          access_token: accessToken,
        },
      );
      return response.data ?? [];
    } catch (error) {
      if (!this.isUserAccountsEdgeError(error)) {
        throw error;
      }
      const page = await this.getPageFromPageAccessToken(accessToken);
      return page ? [page] : [];
    }
  }

  /** When the token is already a Page token, /me refers to that Page (not /me/accounts). */
  async getPageFromPageAccessToken(
    pageAccessToken: string,
  ): Promise<GraphPageRow | null> {
    type MePageResponse = GraphErrorBody & {
      id?: string;
      name?: string;
      instagram_business_account?: GraphInstagramBusinessAccount;
    };

    const response = await this.getJson<MePageResponse>('/me', {
      fields:
        'id,name,instagram_business_account{id,username,name,profile_picture_url}',
      access_token: pageAccessToken,
    });

    if (!response.id?.trim()) {
      return null;
    }

    return {
      id: response.id,
      name: response.name,
      access_token: pageAccessToken,
      instagram_business_account: response.instagram_business_account,
    };
  }

  async debugAccessToken(
    inputToken: string,
    appAccessToken: string,
  ): Promise<GraphDebugTokenResponse['data']> {
    const response = await this.getJson<GraphDebugTokenResponse>(
      '/debug_token',
      {
        input_token: inputToken,
        access_token: appAccessToken,
      },
    );
    return response.data;
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

  async createImageMedia(
    igUserId: string,
    accessToken: string,
    input: { imageUrl: string; caption: string },
  ): Promise<{ id: string }> {
    return this.postForm<{ id: string }>(`/${igUserId}/media`, {
      image_url: input.imageUrl,
      caption: input.caption,
      access_token: accessToken,
    });
  }

  async getMediaContainerStatus(
    containerId: string,
    accessToken: string,
  ): Promise<{ status_code?: string; id?: string }> {
    return this.getJson<GraphErrorBody & { status_code?: string; id?: string }>(
      `/${containerId}`,
      {
        fields: 'status_code,id',
        access_token: accessToken,
      },
    );
  }

  async getMediaById(
    mediaId: string,
    accessToken: string,
    fields = 'id,permalink',
  ): Promise<{ id?: string; permalink?: string }> {
    return this.getJson<GraphErrorBody & { id?: string; permalink?: string }>(
      `/${mediaId}`,
      {
      fields,
      access_token: accessToken,
    });
  }

  async publishMediaContainer(
    igUserId: string,
    accessToken: string,
    creationId: string,
  ): Promise<{ id: string }> {
    return this.postForm<{ id: string }>(`/${igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
  }

  private async postForm<T extends GraphErrorBody & { id?: string }>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.graphBase()}${path}`);
    const body = new URLSearchParams(params);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

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

  private async getJson<T extends GraphErrorBody>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.graphBase()}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url);
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

  private isUserAccountsEdgeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('nonexisting field (accounts)') ||
      message.includes('node type (Page)')
    );
  }
}
