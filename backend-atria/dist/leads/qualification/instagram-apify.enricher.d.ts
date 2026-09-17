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
    private mapRecentNonPinnedPosts;
    private readLikes;
    private readViews;
    private readTimestamp;
    private daysSince;
    private averageLikes;
    private averageViews;
    private averageMetric;
}
