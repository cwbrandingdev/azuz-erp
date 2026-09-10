import { KanbanTaskContentType } from '@prisma/client';
import type {
  GraphInsightMetric,
  GraphInsightsResponse,
  GraphMediaRow,
} from './instagram-insights.types';

export function sumMetricValues(
  response: GraphInsightsResponse | null,
  name: string,
): number {
  const metric = response?.data?.find((item) => item.name === name);
  if (!metric) {
    return 0;
  }
  if (typeof metric.total_value?.value === 'number') {
    return metric.total_value.value;
  }
  return (metric.values ?? []).reduce((total, item) => {
    if (typeof item.value === 'number') {
      return total + item.value;
    }
    return total;
  }, 0);
}

export function readFollowBreakdown(
  response: GraphInsightsResponse | null,
): { follows: number; unfollows: number } {
  const metric = response?.data?.find(
    (item) => item.name === 'follows_and_unfollows',
  );
  const results = metric?.total_value?.breakdowns?.[0]?.results ?? [];
  let follows = 0;
  let unfollows = 0;

  for (const result of results) {
    const key = (result.dimension_values?.[0] ?? '').toUpperCase();
    const value = result.value ?? 0;
    if (
      key === 'UNFOLLOW' ||
      key === 'UNFOLLOWS' ||
      key === 'UNFOLLOWER'
    ) {
      unfollows += value;
    } else if (
      key === 'FOLLOW' ||
      key === 'FOLLOWS' ||
      key === 'FOLLOWER' ||
      key === 'NON_FOLLOWER'
    ) {
      follows += value;
    }
  }

  if (follows === 0 && unfollows === 0) {
    follows = sumMetricValues(response, 'follows_and_unfollows');
  }

  return { follows, unfollows };
}

export function readNamedMetric(
  metrics: GraphInsightMetric[] | undefined,
  names: string[],
): number {
  for (const name of names) {
    const match = metrics?.find((item) => item.name === name);
    if (!match) {
      continue;
    }
    if (typeof match.total_value?.value === 'number') {
      return match.total_value.value;
    }
    const first = match.values?.[0]?.value;
    if (typeof first === 'number') {
      return first;
    }
  }
  return 0;
}

export function mediaThumbnail(row: GraphMediaRow): string | null {
  return row.thumbnail_url ?? row.media_url ?? null;
}

export function matchesContentType(
  contentType: KanbanTaskContentType,
  filter?: KanbanTaskContentType,
): boolean {
  if (!filter) {
    return true;
  }
  return contentType === filter;
}
