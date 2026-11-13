"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_CONTENT_TYPE_DEFINITIONS = exports.SOCIAL_TASK_CONTENT_TYPES = exports.DEFAULT_TASK_CONTENT_TYPE = void 0;
exports.isSocialTaskContentType = isSocialTaskContentType;
exports.contentTypeToApi = contentTypeToApi;
exports.isKanbanTaskContentType = isKanbanTaskContentType;
exports.resolveTaskContentType = resolveTaskContentType;
const client_1 = require("@prisma/client");
exports.DEFAULT_TASK_CONTENT_TYPE = client_1.KanbanTaskContentType.VIDEO_WITH_SCRIPT;
exports.SOCIAL_TASK_CONTENT_TYPES = [
    client_1.KanbanTaskContentType.VIDEO_WITH_SCRIPT,
    client_1.KanbanTaskContentType.STATIC,
    client_1.KanbanTaskContentType.CAROUSEL,
    client_1.KanbanTaskContentType.STORIES_NO_SCRIPT,
];
exports.TASK_CONTENT_TYPE_DEFINITIONS = [
    {
        value: client_1.KanbanTaskContentType.VIDEO_WITH_SCRIPT,
        label: 'Vídeo',
    },
    {
        value: client_1.KanbanTaskContentType.STATIC,
        label: 'Estático',
    },
    {
        value: client_1.KanbanTaskContentType.CAROUSEL,
        label: 'Carrossel',
    },
    {
        value: client_1.KanbanTaskContentType.STORIES_NO_SCRIPT,
        label: 'Stories',
    },
    {
        value: client_1.KanbanTaskContentType.PRESENTATION,
        label: 'Apresentação',
    },
    {
        value: client_1.KanbanTaskContentType.DOCUMENT,
        label: 'Documento',
    },
    {
        value: client_1.KanbanTaskContentType.MOCKUP,
        label: 'Mockup',
    },
    {
        value: client_1.KanbanTaskContentType.PRINT,
        label: 'Impresso',
    },
];
const SOCIAL_TASK_CONTENT_TYPE_SET = new Set(exports.SOCIAL_TASK_CONTENT_TYPES);
function isSocialTaskContentType(contentType) {
    return contentType == null || SOCIAL_TASK_CONTENT_TYPE_SET.has(contentType);
}
function contentTypeToApi(contentType) {
    return contentType.toLowerCase();
}
const KANBAN_TASK_CONTENT_TYPE_SET = new Set(exports.TASK_CONTENT_TYPE_DEFINITIONS.map((item) => item.value));
function isKanbanTaskContentType(value) {
    return (typeof value === 'string' && KANBAN_TASK_CONTENT_TYPE_SET.has(value));
}
function resolveTaskContentType(value) {
    return isKanbanTaskContentType(value) ? value : exports.DEFAULT_TASK_CONTENT_TYPE;
}
//# sourceMappingURL=kanban-content-type.js.map