import { ConfigService } from '@nestjs/config';
import type { GraphInsightsResponse, GraphMediaRow, GraphPageRow, GraphUserProfileResponse } from '../domain/instagram-insights.types';
export declare class InstagramGraphClient {
    private readonly config;
    constructor(config: ConfigService);
    listPages(accessToken: string): Promise<GraphPageRow[]>;
    getUserProfile(igUserId: string, accessToken: string): Promise<GraphUserProfileResponse>;
    getAccountInsights(igUserId: string, accessToken: string, metrics: string[], extra?: Record<string, string>): Promise<GraphInsightsResponse>;
    listMedia(igUserId: string, accessToken: string, options?: {
        since?: number;
        until?: number;
        limit?: number;
    }): Promise<GraphMediaRow[]>;
    listStories(igUserId: string, accessToken: string): Promise<GraphMediaRow[]>;
    getMediaInsights(mediaId: string, accessToken: string, metrics: string[]): Promise<GraphInsightsResponse>;
    createImageMediaContainer(igUserId: string, accessToken: string, input: {
        imageUrl: string;
        caption?: string;
        isCarouselItem?: boolean;
    }): Promise<{
        id: string;
    }>;
    createVideoMediaContainer(igUserId: string, accessToken: string, input: {
        videoUrl: string;
        caption?: string;
        mediaType?: 'REELS' | 'VIDEO';
        isCarouselItem?: boolean;
    }): Promise<{
        id: string;
    }>;
    createCarouselMediaContainer(igUserId: string, accessToken: string, input: {
        children: string[];
        caption?: string;
    }): Promise<{
        id: string;
    }>;
    getMediaContainerStatus(containerId: string, accessToken: string): Promise<{
        status_code?: string;
        id?: string;
    }>;
    publishMediaContainer(igUserId: string, accessToken: string, input: {
        creationId: string;
        publishAtUnix?: number | null;
    }): Promise<{
        id: string;
    }>;
    getMediaPermalink(mediaId: string, accessToken: string): Promise<{
        permalink?: string;
    }>;
    deleteMedia(mediaId: string, accessToken: string): Promise<{
        success: boolean;
    }>;
    private postForm;
    private deleteRequest;
    private getJson;
    private parseGraphResponse;
    private graphBase;
}
