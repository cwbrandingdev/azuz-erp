import { ConfigService } from '@nestjs/config';
export declare const INSTAGRAM_CACHE_MS: number;
export declare const INSTAGRAM_STATS_VERSION = 3;
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
export declare class InstagramApifyEnricher {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    fetchProfileSignals(instagram: string, apifyToken: string): Promise<InstagramProfileQualificationData | null>;
    extractUsername(value: string): string | null;
    private runActor;
    private mapProfileDetails;
    private indexNestedPosts;
    private mapRecentNonPinnedPosts;
    private postKey;
    private readMediaType;
    private readCount;
    private readNumber;
    private readLikes;
    private readViews;
    private readPostImage;
    private readCaption;
    private readPermalink;
    private readText;
    private readHttpUrl;
    private readTimestamp;
    private toIsoTimestamp;
    private daysSince;
    private averageMetric;
}
export declare function readFreshInstagramQualification(rawData: unknown): InstagramProfileQualificationData | null;
