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
    createImageMedia(igUserId: string, accessToken: string, input: {
        imageUrl: string;
        caption: string;
    }): Promise<{
        id: string;
    }>;
    getMediaContainerStatus(containerId: string, accessToken: string): Promise<{
        status_code?: string;
        id?: string;
    }>;
    getMediaById(mediaId: string, accessToken: string, fields?: string): Promise<{
        id?: string;
        permalink?: string;
    }>;
    publishMediaContainer(igUserId: string, accessToken: string, creationId: string): Promise<{
        id: string;
    }>;
    private postForm;
    private getJson;
    private graphBase;
}
