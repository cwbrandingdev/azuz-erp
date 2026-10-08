"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES = exports.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES = exports.UPLOAD_MAX_FILE_SIZE_BYTES = void 0;
exports.isVideoMimeType = isVideoMimeType;
exports.getMaxUploadBytesForMimeType = getMaxUploadBytesForMimeType;
exports.assertUploadFileSize = assertUploadFileSize;
const common_1 = require("@nestjs/common");
exports.UPLOAD_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
exports.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES = 150 * 1024 * 1024;
exports.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES = exports.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES;
function isVideoMimeType(mimetype) {
    return Boolean(mimetype?.startsWith('video/'));
}
function getMaxUploadBytesForMimeType(mimetype) {
    return isVideoMimeType(mimetype)
        ? exports.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES
        : exports.UPLOAD_MAX_FILE_SIZE_BYTES;
}
function assertUploadFileSize(file) {
    const maxBytes = getMaxUploadBytesForMimeType(file.mimetype);
    if (file.size <= maxBytes) {
        return;
    }
    const maxMb = maxBytes / (1024 * 1024);
    throw new common_1.BadRequestException(isVideoMimeType(file.mimetype)
        ? `O vídeo deve ter no máximo ${maxMb}MB.`
        : `O arquivo deve ter no máximo ${maxMb}MB.`);
}
//# sourceMappingURL=upload-limits.js.map