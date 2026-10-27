"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAO_PAULO_TZ = void 0;
exports.toSaoPauloDayKey = toSaoPauloDayKey;
exports.startOfSaoPauloDay = startOfSaoPauloDay;
exports.endOfSaoPauloDayExclusive = endOfSaoPauloDayExclusive;
exports.daysBetween = daysBetween;
exports.currentMonthRange = currentMonthRange;
exports.SAO_PAULO_TZ = 'America/Sao_Paulo';
const SAO_PAULO_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: exports.SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});
function toSaoPauloDayKey(date) {
    return dayKeyFormatter.format(date);
}
function startOfSaoPauloDay(dayKey) {
    return new Date(`${dayKey}T00:00:00.000${SAO_PAULO_OFFSET}`);
}
function endOfSaoPauloDayExclusive(dayKey) {
    return new Date(startOfSaoPauloDay(dayKey).getTime() + DAY_MS);
}
function daysBetween(fromKey, toKey) {
    const diff = startOfSaoPauloDay(toKey).getTime() - startOfSaoPauloDay(fromKey).getTime();
    return Math.round(diff / DAY_MS);
}
function currentMonthRange(now = new Date()) {
    const today = toSaoPauloDayKey(now);
    return { from: `${today.slice(0, 7)}-01`, to: today };
}
//# sourceMappingURL=time-clock-dates.js.map