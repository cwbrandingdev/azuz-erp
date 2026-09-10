"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sumMetricValues = sumMetricValues;
exports.readFollowBreakdown = readFollowBreakdown;
exports.readNamedMetric = readNamedMetric;
exports.mediaThumbnail = mediaThumbnail;
exports.matchesContentType = matchesContentType;
function sumMetricValues(response, name) {
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
function readFollowBreakdown(response) {
    const metric = response?.data?.find((item) => item.name === 'follows_and_unfollows');
    const results = metric?.total_value?.breakdowns?.[0]?.results ?? [];
    let follows = 0;
    let unfollows = 0;
    for (const result of results) {
        const key = (result.dimension_values?.[0] ?? '').toUpperCase();
        const value = result.value ?? 0;
        if (key === 'UNFOLLOW' ||
            key === 'UNFOLLOWS' ||
            key === 'UNFOLLOWER') {
            unfollows += value;
        }
        else if (key === 'FOLLOW' ||
            key === 'FOLLOWS' ||
            key === 'FOLLOWER' ||
            key === 'NON_FOLLOWER') {
            follows += value;
        }
    }
    if (follows === 0 && unfollows === 0) {
        follows = sumMetricValues(response, 'follows_and_unfollows');
    }
    return { follows, unfollows };
}
function readNamedMetric(metrics, names) {
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
function mediaThumbnail(row) {
    return row.thumbnail_url ?? row.media_url ?? null;
}
function matchesContentType(contentType, filter) {
    if (!filter) {
        return true;
    }
    return contentType === filter;
}
//# sourceMappingURL=instagram-insights.metrics.js.map