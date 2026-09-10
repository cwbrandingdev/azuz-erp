"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_LOOKBACK_SECONDS = void 0;
exports.currentBrazilPeriod = currentBrazilPeriod;
exports.resolveInsightsPeriod = resolveInsightsPeriod;
exports.isTimestampInPeriod = isTimestampInPeriod;
exports.intersectWithLookback = intersectWithLookback;
const MONTH_LABELS = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];
const SAO_PAULO_OFFSET_HOURS = 3;
exports.ACCOUNT_LOOKBACK_SECONDS = 30 * 24 * 60 * 60;
function currentBrazilPeriod(now = new Date()) {
    const shifted = new Date(now.getTime() - SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000);
    return {
        month: shifted.getUTCMonth() + 1,
        year: shifted.getUTCFullYear(),
    };
}
function resolveInsightsPeriod(month, year, now = new Date()) {
    const current = currentBrazilPeriod(now);
    let resolvedMonth = Number.isInteger(month) ? Number(month) : current.month;
    let resolvedYear = Number.isInteger(year) ? Number(year) : current.year;
    if (resolvedMonth < 1 || resolvedMonth > 12) {
        resolvedMonth = current.month;
        resolvedYear = current.year;
    }
    if (resolvedYear > current.year ||
        (resolvedYear === current.year && resolvedMonth > current.month)) {
        resolvedMonth = current.month;
        resolvedYear = current.year;
    }
    const since = Date.UTC(resolvedYear, resolvedMonth - 1, 1, SAO_PAULO_OFFSET_HOURS, 0, 0) /
        1000;
    const nextMonthStart = Date.UTC(resolvedYear, resolvedMonth, 1, SAO_PAULO_OFFSET_HOURS, 0, 0) /
        1000;
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const until = Math.max(since + 1, Math.min(nextMonthStart, nowSeconds));
    return {
        month: resolvedMonth,
        year: resolvedYear,
        since,
        until,
        label: `${MONTH_LABELS[resolvedMonth - 1]} ${resolvedYear}`,
    };
}
function isTimestampInPeriod(timestamp, since, until) {
    if (!timestamp) {
        return false;
    }
    const value = Date.parse(timestamp);
    if (Number.isNaN(value)) {
        return false;
    }
    const seconds = Math.floor(value / 1000);
    return seconds >= since && seconds < until;
}
function intersectWithLookback(period, now = new Date()) {
    const lookbackSince = Math.floor(now.getTime() / 1000) - exports.ACCOUNT_LOOKBACK_SECONDS;
    const since = Math.max(period.since, lookbackSince);
    const until = period.until;
    return {
        since,
        until,
        available: since < until,
        partial: since < until && since > period.since,
    };
}
//# sourceMappingURL=instagram-insights.period.js.map