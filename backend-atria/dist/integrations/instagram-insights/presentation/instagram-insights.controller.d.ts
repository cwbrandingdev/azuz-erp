import { InstagramInsightsService } from '../application/instagram-insights.service';
import { QueryInstagramInsightsDto } from './dto/query-instagram-insights.dto';
import { QueryInstagramPeriodDto } from './dto/query-instagram-period.dto';
export declare class InstagramInsightsController {
    private readonly insights;
    constructor(insights: InstagramInsightsService);
    listConversations(query: QueryInstagramPeriodDto): Promise<import("../domain/instagram-insights.types").InstagramConversationsResponse>;
    listClients(): Promise<import("../domain/instagram-insights.types").InstagramInsightClientsResponse>;
    getClientMetrics(clientId: string, query: QueryInstagramInsightsDto): Promise<import("../domain/instagram-insights.types").InstagramClientMetricsResponse>;
}
