"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapInstagramMediaToContentType = mapInstagramMediaToContentType;
const client_1 = require("@prisma/client");
function mapInstagramMediaToContentType(mediaType, mediaProductType) {
    const product = (mediaProductType ?? '').toUpperCase();
    const type = (mediaType ?? '').toUpperCase();
    if (product === 'STORY' || type === 'STORY') {
        return client_1.KanbanTaskContentType.STORIES_NO_SCRIPT;
    }
    if (product === 'REELS' || type === 'VIDEO' || type === 'REELS') {
        return client_1.KanbanTaskContentType.VIDEO_WITH_SCRIPT;
    }
    if (type === 'CAROUSEL_ALBUM' || product === 'CAROUSEL') {
        return client_1.KanbanTaskContentType.CAROUSEL;
    }
    return client_1.KanbanTaskContentType.STATIC;
}
//# sourceMappingURL=instagram-media-type.js.map