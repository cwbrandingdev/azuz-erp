"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.META_MAX_SCHEDULE_LEAD_MS = exports.META_MIN_SCHEDULE_LEAD_MS = void 0;
exports.resolveMetaPublishAt = resolveMetaPublishAt;
exports.META_MIN_SCHEDULE_LEAD_MS = 10 * 60 * 1000;
exports.META_MAX_SCHEDULE_LEAD_MS = 75 * 24 * 60 * 60 * 1000;
function resolveMetaPublishAt(publicationDate, now = new Date()) {
    const targetMs = publicationDate.getTime();
    if (Number.isNaN(targetMs)) {
        return { publishAtUnix: null, error: 'Data de publicação inválida' };
    }
    const leadMs = targetMs - now.getTime();
    if (leadMs <= 0) {
        return { publishAtUnix: null };
    }
    if (leadMs < exports.META_MIN_SCHEDULE_LEAD_MS) {
        return {
            publishAtUnix: null,
            error: 'A publicação no Instagram deve ser agendada com pelo menos 10 minutos de antecedência',
        };
    }
    if (leadMs > exports.META_MAX_SCHEDULE_LEAD_MS) {
        return {
            publishAtUnix: null,
            error: 'A publicação no Instagram não pode ser agendada com mais de 75 dias de antecedência',
        };
    }
    return { publishAtUnix: Math.floor(targetMs / 1000) };
}
//# sourceMappingURL=meta-schedule.js.map