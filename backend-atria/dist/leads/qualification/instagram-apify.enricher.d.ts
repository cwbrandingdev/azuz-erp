import { ConfigService } from '@nestjs/config';
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
export declare class InstagramApifyEnricher {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    fetchProfileSignals(instagram: string, apifyToken: string): Promise<InstagramProfileQualificationData | null>;
    extractUsername(value: string): string | null;
    private runActor;
    private mapProfileDetails;
    private mapRecentNonPinnedPosts;
    private readNumber;
    private readLikes;
    private readViews;
    private readTimestamp;
    private daysSince;
    private averageMetric;
}
