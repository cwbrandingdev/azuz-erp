import { KanbanTaskContentType } from '@prisma/client';
export interface InstagramInsightClient {
    id: string;
    companyName: string;
    avatarUrl: string | null;
    instagram: string | null;
    instagramUserId: string | null;
    hasMetaAccessToken: boolean;
}
export interface InstagramAudienceMetrics {
    newFollowers: number;
    unfollows: number;
    profileVisits: number;
    bioClicks: number;
    reach: number;
    engagement: number;
    netFollowers: number;
    postsCount: number;
    conversationsStarted: number;
    comments: number;
}
export interface InstagramMediaInsight {
    id: string;
    caption: string | null;
    thumbnailUrl: string | null;
    permalink: string | null;
    timestamp: string | null;
    contentType: KanbanTaskContentType;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
}
export interface InstagramClientMetricsResponse {
    client: InstagramInsightClient;
    audience: InstagramAudienceMetrics;
    media: InstagramMediaInsight[];
    period: {
        month: number;
        year: number;
        label: string;
        partial: boolean;
        accountMetricsAvailable: boolean;
    };
    empty: boolean;
}
export interface InstagramInsightClientsResponse {
    clients: InstagramInsightClient[];
}
export interface InstagramConversationRow {
    id: string;
    companyName: string;
    avatarUrl: string | null;
    instagram: string | null;
    conversationsStarted: number;
    comments: number;
}
export interface InstagramConversationsResponse {
    period: {
        month: number;
        year: number;
        label: string;
        partial: boolean;
        accountMetricsAvailable: boolean;
    };
    clients: InstagramConversationRow[];
}
export interface GraphErrorBody {
    error?: {
        message?: string;
        type?: string;
        code?: number;
    };
}
export interface GraphInsightValue {
    value?: number | Record<string, number>;
    end_time?: string;
}
export interface GraphInsightMetric {
    name?: string;
    period?: string;
    values?: GraphInsightValue[];
    total_value?: {
        value?: number;
        breakdowns?: Array<{
            results?: Array<{
                dimension_values?: string[];
                value?: number;
            }>;
        }>;
    };
}
export interface GraphInsightsResponse extends GraphErrorBody {
    data?: GraphInsightMetric[];
}
export interface GraphMediaRow {
    id: string;
    caption?: string;
    media_type?: string;
    media_product_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
}
export interface GraphMediaListResponse extends GraphErrorBody {
    data?: GraphMediaRow[];
    paging?: {
        cursors?: {
            before?: string;
            after?: string;
        };
        next?: string;
    };
}
export interface GraphUserProfileResponse extends GraphErrorBody {
    id?: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
}
export interface GraphInstagramBusinessAccount {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
}
export interface GraphPageRow {
    id: string;
    name?: string;
    instagram_business_account?: GraphInstagramBusinessAccount;
}
export interface GraphPageListResponse extends GraphErrorBody {
    data?: GraphPageRow[];
    paging?: {
        next?: string;
    };
}
