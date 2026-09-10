import { KanbanTaskContentType } from '@prisma/client';
import type { InstagramClientMetricsResponse, InstagramConversationsResponse, InstagramInsightClientsResponse } from '../domain/instagram-insights.types';
import { InstagramCredentialsResolver } from '../infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../infrastructure/instagram-graph.client';
export declare class InstagramInsightsService {
    private readonly credentials;
    private readonly graph;
    private readonly logger;
    constructor(credentials: InstagramCredentialsResolver, graph: InstagramGraphClient);
    listClients(): Promise<InstagramInsightClientsResponse>;
    listConversations(query?: {
        month?: number;
        year?: number;
    }): Promise<InstagramConversationsResponse>;
    getClientMetrics(clientId: string, query?: {
        contentType?: KanbanTaskContentType;
        month?: number;
        year?: number;
    }): Promise<InstagramClientMetricsResponse>;
    private fetchAudience;
    private fetchConversations;
    private fetchMedia;
    private toMediaInsight;
    private safeAccountInsights;
    private rethrowExpired;
}
