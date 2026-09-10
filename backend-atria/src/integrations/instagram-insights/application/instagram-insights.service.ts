import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { KanbanTaskContentType } from '@prisma/client';
import { mapInstagramMediaToContentType } from '../domain/instagram-media-type';
import {
  matchesContentType,
  mediaThumbnail,
  readFollowBreakdown,
  readNamedMetric,
  sumMetricValues,
} from '../domain/instagram-insights.metrics';
import { MetaTokenExpiredError } from '../domain/meta-token-expired.error';
import type {
  GraphInsightsResponse,
  GraphMediaRow,
  InstagramAudienceMetrics,
  InstagramClientMetricsResponse,
  InstagramConversationsResponse,
  InstagramInsightClientsResponse,
  InstagramMediaInsight,
} from '../domain/instagram-insights.types';
import { InstagramCredentialsResolver } from '../infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../infrastructure/instagram-graph.client';
import { isTimestampInPeriod, intersectWithLookback, resolveInsightsPeriod } from '../domain/instagram-insights.period';

const FEED_MEDIA_METRICS = ['likes', 'comments', 'shares', 'saved', 'reach'];
const STORY_MEDIA_METRICS = ['reach', 'views', 'replies', 'shares'];

@Injectable()
export class InstagramInsightsService {
  private readonly logger = new Logger(InstagramInsightsService.name);

  constructor(
    private readonly credentials: InstagramCredentialsResolver,
    private readonly graph: InstagramGraphClient,
  ) {}

  async listClients(): Promise<InstagramInsightClientsResponse> {
    await this.credentials.syncFromMeta();
    const clients = await this.credentials.listConnectedClients();
    return { clients };
  }

  async listConversations(
    query: { month?: number; year?: number } = {},
  ): Promise<InstagramConversationsResponse> {
    try {
      await this.credentials.syncFromMeta();
      const period = resolveInsightsPeriod(query.month, query.year);
      const graphWindow = intersectWithLookback(period);
      const clients = await this.credentials.listConnectedClients();

      const rows = await Promise.all(
        clients.map(async (client) => {
          try {
            const resolved = await this.credentials.resolveForClient(client.id);
            const messaging = await this.fetchConversations(
              resolved.instagramUserId,
              resolved.accessToken,
              graphWindow,
            );
            return {
              id: client.id,
              companyName: client.companyName,
              avatarUrl: client.avatarUrl,
              instagram: client.instagram,
              conversationsStarted: messaging.conversationsStarted,
              comments: messaging.comments,
            };
          } catch (error) {
            this.rethrowExpired(error);
            this.logger.warn(
              `Failed to load conversations for ${client.companyName}: ${String(error)}`,
            );
            return {
              id: client.id,
              companyName: client.companyName,
              avatarUrl: client.avatarUrl,
              instagram: client.instagram,
              conversationsStarted: 0,
              comments: 0,
            };
          }
        }),
      );

      rows.sort((left, right) => {
        if (right.conversationsStarted !== left.conversationsStarted) {
          return right.conversationsStarted - left.conversationsStarted;
        }
        return right.comments - left.comments;
      });

      return {
        period: {
          month: period.month,
          year: period.year,
          label: period.label,
          partial: graphWindow.partial,
          accountMetricsAvailable: graphWindow.available,
        },
        clients: rows,
      };
    } catch (error) {
      if (error instanceof MetaTokenExpiredError) {
        throw new UnprocessableEntityException({
          message:
            'Token de acesso Meta expirado. Atualize as credenciais deste cliente.',
          code: 'META_TOKEN_EXPIRED',
        });
      }
      throw error;
    }
  }

  async getClientMetrics(
    clientId: string,
    query: {
      contentType?: KanbanTaskContentType;
      month?: number;
      year?: number;
    } = {},
  ): Promise<InstagramClientMetricsResponse> {
    const period = resolveInsightsPeriod(query.month, query.year);
    const graphWindow = intersectWithLookback(period);
    try {
      const resolved = await this.credentials.resolveForClient(clientId);
      const [audience, media] = await Promise.all([
        this.fetchAudience(
          resolved.instagramUserId,
          resolved.accessToken,
          graphWindow,
        ),
        this.fetchMedia(
          resolved.instagramUserId,
          resolved.accessToken,
          period,
          query.contentType,
        ),
      ]);

      const audienceWithPosts = {
        ...audience,
        netFollowers: audience.newFollowers - audience.unfollows,
        postsCount: media.length,
      };

      return {
        client: {
          id: resolved.clientId,
          companyName: resolved.companyName,
          avatarUrl: resolved.avatarUrl,
          instagram: resolved.instagram,
          instagramUserId: resolved.instagramUserId,
          hasMetaAccessToken: resolved.hasMetaAccessToken,
        },
        audience: audienceWithPosts,
        media,
        period: {
          month: period.month,
          year: period.year,
          label: period.label,
          partial: graphWindow.partial,
          accountMetricsAvailable: graphWindow.available,
        },
        empty:
          media.length === 0 &&
          audience.reach === 0 &&
          audience.newFollowers === 0 &&
          audience.profileVisits === 0,
      };
    } catch (error) {
      if (error instanceof MetaTokenExpiredError) {
        throw new UnprocessableEntityException({
          message:
            'Token de acesso Meta expirado. Atualize as credenciais deste cliente.',
          code: 'META_TOKEN_EXPIRED',
        });
      }
      throw error;
    }
  }

  private async fetchAudience(
    igUserId: string,
    accessToken: string,
    windowBounds: {
      since: number;
      until: number;
      available: boolean;
    },
  ): Promise<Omit<InstagramAudienceMetrics, 'netFollowers' | 'postsCount'>> {
    if (!windowBounds.available) {
      return {
        newFollowers: 0,
        unfollows: 0,
        profileVisits: 0,
        bioClicks: 0,
        reach: 0,
        engagement: 0,
        conversationsStarted: 0,
        comments: 0,
      };
    }

    const window = {
      period: 'day',
      since: String(windowBounds.since),
      until: String(windowBounds.until),
    };

    const [follows, reach, visits, engagement, messaging] = await Promise.all([
      this.safeAccountInsights(
        igUserId,
        accessToken,
        ['follows_and_unfollows'],
        {
          ...window,
          metric_type: 'total_value',
          breakdown: 'follow_type',
        },
      ),
      this.safeAccountInsights(igUserId, accessToken, ['reach'], window),
      this.safeAccountInsights(
        igUserId,
        accessToken,
        ['profile_views', 'website_clicks', 'profile_links_taps'],
        {
          ...window,
          metric_type: 'total_value',
        },
      ),
      this.safeAccountInsights(
        igUserId,
        accessToken,
        ['accounts_engaged', 'total_interactions'],
        {
          ...window,
          metric_type: 'total_value',
        },
      ),
      this.safeAccountInsights(
        igUserId,
        accessToken,
        ['replies', 'comments'],
        {
          ...window,
          metric_type: 'total_value',
        },
      ),
    ]);

    const followBreakdown = readFollowBreakdown(follows);
    const newFollowers = followBreakdown.follows;

    return {
      newFollowers,
      unfollows: followBreakdown.unfollows,
      profileVisits: sumMetricValues(visits, 'profile_views'),
      bioClicks:
        sumMetricValues(visits, 'website_clicks') ||
        sumMetricValues(visits, 'profile_links_taps'),
      reach: sumMetricValues(reach, 'reach'),
      engagement:
        sumMetricValues(engagement, 'accounts_engaged') ||
        sumMetricValues(engagement, 'total_interactions'),
      conversationsStarted: sumMetricValues(messaging, 'replies'),
      comments: sumMetricValues(messaging, 'comments'),
    };
  }

  private async fetchConversations(
    igUserId: string,
    accessToken: string,
    windowBounds: {
      since: number;
      until: number;
      available: boolean;
    },
  ): Promise<{ conversationsStarted: number; comments: number }> {
    if (!windowBounds.available) {
      return { conversationsStarted: 0, comments: 0 };
    }

    const messaging = await this.safeAccountInsights(
      igUserId,
      accessToken,
      ['replies', 'comments'],
      {
        period: 'day',
        since: String(windowBounds.since),
        until: String(windowBounds.until),
        metric_type: 'total_value',
      },
    );

    return {
      conversationsStarted: sumMetricValues(messaging, 'replies'),
      comments: sumMetricValues(messaging, 'comments'),
    };
  }

  private async fetchMedia(
    igUserId: string,
    accessToken: string,
    period: { since: number; until: number },
    contentType?: KanbanTaskContentType,
  ): Promise<InstagramMediaInsight[]> {
    const [feed, stories] = await Promise.all([
      this.graph
        .listMedia(igUserId, accessToken, {
          since: period.since,
          until: period.until,
        })
        .catch((error) => {
          this.rethrowExpired(error);
          this.logger.warn(`Failed to list Instagram media: ${String(error)}`);
          return [] as GraphMediaRow[];
        }),
      this.graph.listStories(igUserId, accessToken).catch((error) => {
        this.rethrowExpired(error);
        this.logger.warn(`Failed to list Instagram stories: ${String(error)}`);
        return [] as GraphMediaRow[];
      }),
    ]);

    const rows = [...feed, ...stories].filter((row) =>
      isTimestampInPeriod(row.timestamp, period.since, period.until),
    );
    const insights = await Promise.all(
      rows.map((row) => this.toMediaInsight(row, accessToken)),
    );

    return insights.filter((item) =>
      matchesContentType(item.contentType, contentType),
    );
  }

  private async toMediaInsight(
    row: GraphMediaRow,
    accessToken: string,
  ): Promise<InstagramMediaInsight> {
    const contentType = mapInstagramMediaToContentType(
      row.media_type,
      row.media_product_type,
    );
    const isStory = contentType === KanbanTaskContentType.STORIES_NO_SCRIPT;
    const metrics = isStory ? STORY_MEDIA_METRICS : FEED_MEDIA_METRICS;
    const insightResponse = await this.graph
      .getMediaInsights(row.id, accessToken, metrics)
      .catch((error) => {
        this.rethrowExpired(error);
        return { data: [] } as GraphInsightsResponse;
      });

    const data = insightResponse.data;
    return {
      id: row.id,
      caption: row.caption ?? null,
      thumbnailUrl: mediaThumbnail(row),
      permalink: row.permalink ?? null,
      timestamp: row.timestamp ?? null,
      contentType,
      likes: readNamedMetric(data, ['likes']) || row.like_count || 0,
      comments:
        readNamedMetric(data, ['comments', 'replies']) ||
        row.comments_count ||
        0,
      shares: readNamedMetric(data, ['shares']),
      saves: readNamedMetric(data, ['saved', 'saves']),
      reach: readNamedMetric(data, ['reach', 'views']),
    };
  }

  private async safeAccountInsights(
    igUserId: string,
    accessToken: string,
    metrics: string[],
    extra: Record<string, string>,
  ): Promise<GraphInsightsResponse> {
    try {
      return await this.graph.getAccountInsights(
        igUserId,
        accessToken,
        metrics,
        extra,
      );
    } catch (error) {
      this.rethrowExpired(error);
      this.logger.warn(
        `Instagram account insight ${metrics.join(',')} failed: ${String(error)}`,
      );
      return { data: [] };
    }
  }

  private rethrowExpired(error: unknown) {
    if (error instanceof MetaTokenExpiredError) {
      throw error;
    }
  }
}
