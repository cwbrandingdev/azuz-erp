import { KanbanTaskContentType } from '@prisma/client';
import type { GraphInsightMetric, GraphInsightsResponse, GraphMediaRow } from './instagram-insights.types';
export declare function sumMetricValues(response: GraphInsightsResponse | null, name: string): number;
export declare function readFollowBreakdown(response: GraphInsightsResponse | null): {
    follows: number;
    unfollows: number;
};
export declare function readNamedMetric(metrics: GraphInsightMetric[] | undefined, names: string[]): number;
export declare function mediaThumbnail(row: GraphMediaRow): string | null;
export declare function matchesContentType(contentType: KanbanTaskContentType, filter?: KanbanTaskContentType): boolean;
