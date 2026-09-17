import {
  BadGatewayException,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const APIFY_TIMEOUT_MS = 120_000;
const DEFAULT_ACTOR = 'apify~instagram-scraper';
const POSTS_FETCH_LIMIT = 15;

export interface InstagramPostSnapshot {
  likes: number | null;
  views: number | null;
  timestamp: string | null;
  isPinned: boolean;
}

export interface InstagramProfileQualificationData {
  username: string;
  profileUrl: string;
  biography: string | null;
  followersCount: number | null;
  followsCount: number | null;
  isBusinessAccount: boolean | null;
  businessCategoryName: string | null;
  externalUrl: string | null;
  recentPosts: InstagramPostSnapshot[];
  lastPostAt: string | null;
  daysSinceLastPost: number | null;
  averageLikesRecent: number | null;
  averageViewsRecent: number | null;
  fetchedAt: string;
  provider: 'apify';
}

interface ApifyRow {
  likesCount?: number;
  likes?: number;
  likeCount?: number;
  timestamp?: string;
  takenAt?: string;
  isPinned?: boolean;
  pinned?: boolean;
  biography?: string;
  bio?: string;
  followersCount?: number;
  followers?: number;
  followsCount?: number;
  follows?: number;
  isBusinessAccount?: boolean;
  businessCategoryName?: string;
  category?: string;
  externalUrl?: string;
  website?: string;
  videoViewCount?: number;
  viewCount?: number;
  viewsCount?: number;
  videoPlayCount?: number;
  playCount?: number;
  plays?: number;
  [key: string]: unknown;
}

@Injectable()
export class InstagramApifyEnricher {
  private readonly logger = new Logger(InstagramApifyEnricher.name);

  constructor(private readonly configService: ConfigService) {}

  async fetchProfileSignals(
    instagram: string,
    apifyToken: string,
  ): Promise<InstagramProfileQualificationData | null> {
    const username = this.extractUsername(instagram);
    if (!username) {
      return null;
    }

    const profileUrl = `https://www.instagram.com/${username}/`;
    const actorId =
      this.configService.get<string>('APIFY_INSTAGRAM_ACTOR')?.trim() ||
      DEFAULT_ACTOR;

    try {
      const [postRows, detailRows] = await Promise.all([
        this.runActor(actorId, apifyToken, {
          directUrls: [profileUrl],
          resultsType: 'posts',
          resultsLimit: POSTS_FETCH_LIMIT,
        }),
        this.runActor(actorId, apifyToken, {
          directUrls: [profileUrl],
          resultsType: 'details',
          resultsLimit: 1,
        }),
      ]);

      const posts = this.mapRecentNonPinnedPosts(postRows);
      const lastPostAt = posts[0]?.timestamp ?? null;
      const daysSinceLastPost = this.daysSince(lastPostAt);
      const recentTwo = posts.slice(0, 2);
      const profile = this.mapProfileDetails(detailRows, username);

      return {
        username,
        profileUrl,
        biography: profile.biography,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        isBusinessAccount: profile.isBusinessAccount,
        businessCategoryName: profile.businessCategoryName,
        externalUrl: profile.externalUrl,
        recentPosts: recentTwo,
        lastPostAt,
        daysSinceLastPost,
        averageLikesRecent: this.averageMetric(
          recentTwo.map((post) => post.likes),
        ),
        averageViewsRecent: this.averageMetric(
          recentTwo.map((post) => post.views),
        ),
        fetchedAt: new Date().toISOString(),
        provider: 'apify',
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      if (error instanceof RequestTimeoutException) {
        throw error;
      }
      this.logger.warn(`Apify Instagram request failed: ${String(error)}`);
      throw new BadGatewayException(
        'Não foi possível conectar ao Apify para Instagram.',
      );
    }
  }

  extractUsername(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const fromUrl = trimmed.match(
      /instagram\.com\/([a-zA-Z0-9._]+)/i,
    )?.[1];
    if (fromUrl) {
      return fromUrl.replace(/\/$/, '').toLowerCase();
    }

    const handle = trimmed.replace(/^@/, '').split(/[/?#]/)[0]?.trim();
    return handle ? handle.toLowerCase() : null;
  }

  private async runActor(
    actorId: string,
    apifyToken: string,
    payload: Record<string, unknown>,
  ): Promise<ApifyRow[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(apifyToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      let body: unknown;
      try {
        body = bodyText ? JSON.parse(bodyText) : [];
      } catch {
        body = [];
      }

      if (!response.ok) {
        this.logger.warn(
          `Apify Instagram error ${response.status}: ${bodyText.slice(0, 400)}`,
        );
        throw new BadGatewayException(
          'Não foi possível buscar dados do Instagram no Apify.',
        );
      }

      return Array.isArray(body) ? (body as ApifyRow[]) : [];
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          'A consulta ao Instagram no Apify excedeu o tempo limite.',
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapProfileDetails(
    rows: ApifyRow[],
    username: string,
  ): {
    biography: string | null;
    followersCount: number | null;
    followsCount: number | null;
    isBusinessAccount: boolean | null;
    businessCategoryName: string | null;
    externalUrl: string | null;
  } {
    const row =
      rows.find((item) => {
        const handle = String(item.username ?? item.ownerUsername ?? '')
          .trim()
          .toLowerCase();
        return !handle || handle === username;
      }) ?? rows[0];

    if (!row) {
      return {
        biography: null,
        followersCount: null,
        followsCount: null,
        isBusinessAccount: null,
        businessCategoryName: null,
        externalUrl: null,
      };
    }

    const bioRaw = row.biography ?? row.bio;
    const biography =
      typeof bioRaw === 'string' && bioRaw.trim() ? bioRaw.trim() : null;

    const categoryRaw = row.businessCategoryName ?? row.category;
    const businessCategoryName =
      typeof categoryRaw === 'string' && categoryRaw.trim()
        ? categoryRaw.trim()
        : null;

    const externalRaw = row.externalUrl ?? row.website;
    const externalUrl =
      typeof externalRaw === 'string' && externalRaw.trim()
        ? externalRaw.trim()
        : null;

    return {
      biography,
      followersCount: this.readNumber(row.followersCount, row.followers),
      followsCount: this.readNumber(row.followsCount, row.follows),
      isBusinessAccount:
        typeof row.isBusinessAccount === 'boolean'
          ? row.isBusinessAccount
          : null,
      businessCategoryName,
      externalUrl,
    };
  }

  private mapRecentNonPinnedPosts(
    rows: ApifyRow[],
  ): InstagramPostSnapshot[] {
    return rows
      .map((row) => ({
        likes: this.readLikes(row),
        views: this.readViews(row),
        timestamp: this.readTimestamp(row),
        isPinned: Boolean(row.isPinned ?? row.pinned),
      }))
      .filter((post) => !post.isPinned)
      .sort((a, b) => {
        const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
        const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
        return bTime - aTime;
      });
  }

  private readNumber(...candidates: unknown[]): number | null {
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
    return null;
  }

  private readLikes(row: ApifyRow): number | null {
    return this.readNumber(row.likesCount, row.likes, row.likeCount);
  }

  private readViews(row: ApifyRow): number | null {
    return this.readNumber(
      row.videoViewCount,
      row.viewCount,
      row.viewsCount,
      row.videoPlayCount,
      row.playCount,
      row.plays,
    );
  }

  private readTimestamp(row: ApifyRow): string | null {
    const value = row.timestamp ?? row.takenAt;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return null;
  }

  private daysSince(iso: string | null): number | null {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return null;
    return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
  }

  private averageMetric(values: Array<number | null>): number | null {
    const numbers = values.filter((n): n is number => n != null);
    if (numbers.length === 0) return null;
    return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
  }
}
