"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRODUCTION_PHASE = exports.PRODUCTION_PHASE_LABELS = exports.PRODUCTION_PHASE_COLORS = exports.PRODUCTION_PHASE_DEFINITIONS = void 0;
exports.contentTypeRequiresScript = contentTypeRequiresScript;
exports.defaultProductionPhaseForContentType = defaultProductionPhaseForContentType;
exports.phaseToApi = phaseToApi;
exports.phaseFromApi = phaseFromApi;
exports.isProductionPhase = isProductionPhase;
exports.resolveProductionPhaseForStatus = resolveProductionPhaseForStatus;
exports.resolveTaskDisplayColor = resolveTaskDisplayColor;
exports.resolveTaskDisplayLabel = resolveTaskDisplayLabel;
const client_1 = require("@prisma/client");
const kanban_content_type_1 = require("./kanban-content-type");
exports.PRODUCTION_PHASE_DEFINITIONS = [
    {
        phase: client_1.ProductionPhase.ROTEIRO,
        label: 'Roteiro',
        color: '#92400E',
        order: 1,
    },
    {
        phase: client_1.ProductionPhase.EM_GRAVACAO,
        label: 'Em gravação',
        color: '#EC4899',
        order: 2,
    },
];
exports.PRODUCTION_PHASE_COLORS = Object.fromEntries(exports.PRODUCTION_PHASE_DEFINITIONS.map((def) => [def.phase, def.color]));
exports.PRODUCTION_PHASE_LABELS = Object.fromEntries(exports.PRODUCTION_PHASE_DEFINITIONS.map((def) => [def.phase, def.label]));
exports.DEFAULT_PRODUCTION_PHASE = client_1.ProductionPhase.ROTEIRO;
function contentTypeRequiresScript(contentType) {
    return (contentType == null ||
        contentType === client_1.KanbanTaskContentType.VIDEO_WITH_SCRIPT);
}
function defaultProductionPhaseForContentType(contentType) {
    if (!(0, kanban_content_type_1.isSocialTaskContentType)(contentType))
        return null;
    return contentTypeRequiresScript(contentType)
        ? client_1.ProductionPhase.ROTEIRO
        : client_1.ProductionPhase.EM_GRAVACAO;
}
function phaseToApi(phase) {
    return phase.toLowerCase();
}
function phaseFromApi(value) {
    return value.toUpperCase();
}
function isProductionPhase(value) {
    return (value === client_1.ProductionPhase.ROTEIRO || value === client_1.ProductionPhase.EM_GRAVACAO);
}
function resolveProductionPhaseForStatus(status, currentPhase, requestedPhase, contentType) {
    if (status !== client_1.KanbanTaskStatus.FALTA_GRAVAR) {
        return null;
    }
    if (!(0, kanban_content_type_1.isSocialTaskContentType)(contentType)) {
        return null;
    }
    if (isProductionPhase(requestedPhase)) {
        return requestedPhase;
    }
    if (isProductionPhase(currentPhase)) {
        return currentPhase;
    }
    return defaultProductionPhaseForContentType(contentType);
}
function resolveTaskDisplayColor(status, productionPhase, statusColors) {
    if (status === client_1.KanbanTaskStatus.FALTA_GRAVAR && productionPhase) {
        return exports.PRODUCTION_PHASE_COLORS[productionPhase];
    }
    return statusColors[status];
}
function resolveTaskDisplayLabel(status, productionPhase, statusLabels) {
    if (status === client_1.KanbanTaskStatus.FALTA_GRAVAR && productionPhase) {
        return exports.PRODUCTION_PHASE_LABELS[productionPhase];
    }
    return statusLabels[status];
}
//# sourceMappingURL=production-phase.js.map