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
const RECENT_POSTS_LIMIT = 9;
export const INSTAGRAM_CACHE_MS = 72 * 60 * 60 * 1000;
export const INSTAGRAM_STATS_VERSION = 3;

export type InstagramMediaType = 'image' | 'carousel' | 'reel' | 'video';

export interface InstagramPostSnapshot {
  likes: number | null;
  comments: number | null;
  views: number | null;
  timestamp: string | null;
  isPinned: boolean;
  mediaType: InstagramMediaType;
  displayUrl: string | null;
  caption: string | null;
  permalink: string | null;
}

export interface InstagramProfileQualificationData {
  username: string;
  profileUrl: string;
  fullName: string | null;
  profilePicUrl: string | null;
  biography: string | null;
  followersCount: number | null;
  followsCount: number | null;
  postsCount: number | null;
  highlightCount: number | null;
  verified: boolean | null;
  isBusinessAccount: boolean | null;
  businessCategoryName: string | null;
  externalUrl: string | null;
  recentPosts: InstagramPostSnapshot[];
  lastPostAt: string | null;
  daysSinceLastPost: number | null;
  averageLikesRecent: number | null;
  averageViewsRecent: number | null;
  averageReelViews: number | null;
  statsVersion: typeof INSTAGRAM_STATS_VERSION;
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
  igPlayCount?: number;
  commentsCount?: number;
  comments?: number;
  commentCount?: number;
  postsCount?: number;
  posts?: number;
  mediaCount?: number;
  highlightReelCount?: number;
  fullName?: string;
  verified?: boolean;
  isVerified?: boolean;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  productType?: string;
  type?: string;
  shortCode?: string;
  latestPosts?: unknown;
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

      const detailPosts = this.indexNestedPosts(detailRows);
      const posts = this.mapRecentNonPinnedPosts(postRows, detailPosts);
      const lastPostAt = posts[0]?.timestamp ?? null;
      const daysSinceLastPost = this.daysSince(lastPostAt);
      const recent = posts.slice(0, RECENT_POSTS_LIMIT);
      const scored = recent.slice(0, 2);
      const profile = this.mapProfileDetails(detailRows, username);
      const reelViews = recent
        .filter((post) => post.mediaType === 'reel' || post.mediaType === 'video')
        .map((post) => post.views);

      return {
        username,
        profileUrl,
        fullName: profile.fullName,
        profilePicUrl: profile.profilePicUrl,
        biography: profile.biography,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        postsCount: profile.postsCount,
        highlightCount: profile.highlightCount,
        verified: profile.verified,
        isBusinessAccount: profile.isBusinessAccount,
        businessCategoryName: profile.businessCategoryName,
        externalUrl: profile.externalUrl,
        recentPosts: recent,
        lastPostAt,
        daysSinceLastPost,
        averageLikesRecent: this.averageMetric(scored.map((post) => post.likes)),
        averageViewsRecent: this.averageMetric(scored.map((post) => post.views)),
        averageReelViews: this.averageMetric(reelViews),
        statsVersion: INSTAGRAM_STATS_VERSION,
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
    fullName: string | null;
    profilePicUrl: string | null;
    followersCount: number | null;
    followsCount: number | null;
    postsCount: number | null;
    highlightCount: number | null;
    verified: boolean | null;
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
        fullName: null,
        profilePicUrl: null,
        followersCount: null,
        followsCount: null,
        postsCount: null,
        highlightCount: null,
        verified: null,
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
      fullName: this.readText(row.fullName),
      profilePicUrl: this.readHttpUrl(row.profilePicUrlHD, row.profilePicUrl),
      followersCount: this.readCount(row.followersCount, row.followers),
      followsCount: this.readCount(row.followsCount, row.follows),
      postsCount: this.readCount(row.postsCount, row.posts, row.mediaCount),
      highlightCount: this.readCount(row.highlightReelCount),
      verified:
        typeof row.verified === 'boolean'
          ? row.verified
          : typeof row.isVerified === 'boolean'
            ? row.isVerified
            : null,
      isBusinessAccount:
        typeof row.isBusinessAccount === 'boolean'
          ? row.isBusinessAccount
          : null,
      businessCategoryName,
      externalUrl,
    };
  }

  private indexNestedPosts(rows: ApifyRow[]): Map<string, ApifyRow> {
    const indexed = new Map<string, ApifyRow>();
    for (const row of rows) {
      for (const list of [row.latestPosts, row.latestIgtvVideos]) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
          const post = item as ApifyRow;
          const key = this.postKey(post);
          if (key && !indexed.has(key)) {
            indexed.set(key, post);
          }
        }
      }
    }
    return indexed;
  }

  private mapRecentNonPinnedPosts(
    rows: ApifyRow[],
    detailPosts: Map<string, ApifyRow>,
  ): InstagramPostSnapshot[] {
    return rows
      .map((row) => {
        const extra = detailPosts.get(this.postKey(row) ?? '');
        return {
          likes: this.readLikes(row) ?? (extra ? this.readLikes(extra) : null),
          comments:
            this.readCount(row.commentsCount, row.comments, row.commentCount) ??
            (extra
              ? this.readCount(extra.commentsCount, extra.comments, extra.commentCount)
              : null),
          views: this.readViews(row) ?? (extra ? this.readViews(extra) : null),
          timestamp: this.readTimestamp(row) ?? (extra ? this.readTimestamp(extra) : null),
          isPinned: Boolean(row.isPinned ?? row.pinned ?? extra?.isPinned ?? extra?.pinned),
          mediaType: this.readMediaType(row, extra),
          displayUrl:
            this.readPostImage(row) ?? (extra ? this.readPostImage(extra) : null),
          caption: this.readCaption(row) ?? (extra ? this.readCaption(extra) : null),
          permalink:
            this.readPermalink(row) ?? (extra ? this.readPermalink(extra) : null),
        };
      })
      .filter((post) => !post.isPinned)
      .sort((a, b) => {
        const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
        const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
        return bTime - aTime;
      });
  }

  private postKey(row: ApifyRow): string | null {
    const shortCode = this.readText(row.shortCode) ?? this.readText(row.shortcode);
    if (shortCode) return shortCode.toLowerCase();
    const url = this.readPermalink(row);
    const match = url?.match(/\/(?:p|reel|tv)\/([^/?#]+)/i);
    return match?.[1]?.toLowerCase() ?? null;
  }

  private readMediaType(row: ApifyRow, extra?: ApifyRow): InstagramMediaType {
    const product = String(row.productType ?? extra?.productType ?? '').toLowerCase();
    const type = String(
      row.type ?? row.__typename ?? extra?.type ?? extra?.__typename ?? '',
    ).toLowerCase();
    if (product === 'clips' || type.includes('reel')) return 'reel';
    if (product === 'igtv' || type.includes('igtv')) return 'video';
    if (type.includes('sidecar') || type.includes('carousel')) return 'carousel';
    if (type.includes('video')) return 'reel';
    return 'image';
  }

  private readCount(...candidates: unknown[]): number | null {
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (value && typeof value === 'object' && 'count' in value) {
        const count = (value as { count?: unknown }).count;
        if (typeof count === 'number' && Number.isFinite(count)) {
          return count;
        }
      }
    }
    return null;
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
      row.igPlayCount,
      row.videoPlayCount,
      row.playCount,
      row.plays,
      row.videoViewCount,
      row.viewCount,
      row.viewsCount,
    );
  }

  private readPostImage(row: ApifyRow): string | null {
    const direct = this.readHttpUrl(row.displayUrl, row.thumbnailUrl, row.imageUrl);
    if (direct) return direct;
    const images = row.images;
    if (!Array.isArray(images)) return null;
    for (const image of images) {
      const url = this.readHttpUrl(image);
      if (url) return url;
      if (image && typeof image === 'object') {
        const record = image as Record<string, unknown>;
        const nested = this.readHttpUrl(record.url, record.displayUrl);
        if (nested) return nested;
      }
    }
    return null;
  }

  private readCaption(row: ApifyRow): string | null {
    const caption = this.readText(row.caption);
    if (!caption) return null;
    return caption.length > 500 ? `${caption.slice(0, 497)}...` : caption;
  }

  private readPermalink(row: ApifyRow): string | null {
    return this.readHttpUrl(row.url, row.permalink);
  }

  private readText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private readHttpUrl(...candidates: unknown[]): string | null {
    for (const value of candidates) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
    }
    return null;
  }

  private readTimestamp(row: ApifyRow): string | null {
    const candidates = [
      row.timestamp,
      row.takenAt,
      row.takenAtTimestamp,
      row.taken_at,
      row.taken_at_timestamp,
      row.date,
      row.createdAt,
    ];
    for (const value of candidates) {
      const iso = this.toIsoTimestamp(value);
      if (iso) return iso;
    }
    return null;
  }

  private toIsoTimestamp(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value;
      const date = new Date(milliseconds);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }

    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      return this.toIsoTimestamp(Number(trimmed));
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return new Date(parsed).toISOString();
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

export function readFreshInstagramQualification(
  rawData: unknown,
): InstagramProfileQualificationData | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }

  const snapshot = (rawData as Record<string, unknown>).instagramQualification;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  const fetchedAt = (snapshot as { fetchedAt?: string }).fetchedAt;
  if (!fetchedAt || Date.parse(fetchedAt) < Date.now() - INSTAGRAM_CACHE_MS) {
    return null;
  }

  const data = snapshot as InstagramProfileQualificationData;
  if (data.statsVersion !== 2 && data.statsVersion !== INSTAGRAM_STATS_VERSION) {
    return null;
  }
  if (!('biography' in data) || !('followersCount' in data)) {
    return null;
  }

  const posts = data.recentPosts;
  if (!Array.isArray(posts)) {
    return data;
  }
  if (posts.some((post) => !post || !('views' in post))) {
    return null;
  }
  if (
    posts.length > 0 &&
    posts.some((post) => !post || !('displayUrl' in post))
  ) {
    return null;
  }
  const hasPostDate =
    Boolean(data.lastPostAt) ||
    posts.some((post) => Boolean(post?.timestamp));
  if (posts.length > 0 && !hasPostDate && data.statsVersion < INSTAGRAM_STATS_VERSION) {
    return null;
  }

  return data;
}
