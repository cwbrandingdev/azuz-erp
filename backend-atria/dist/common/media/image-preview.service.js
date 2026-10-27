"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ImagePreviewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImagePreviewService = exports.IMAGE_PREVIEW_QUALITY = exports.IMAGE_PREVIEW_MAX_EDGE = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const sharp_1 = __importDefault(require("sharp"));
const supabase_storage_service_1 = require("../../supabase/supabase-storage.service");
exports.IMAGE_PREVIEW_MAX_EDGE = 1600;
exports.IMAGE_PREVIEW_QUALITY = 80;
const PREVIEWABLE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/avif',
]);
const SKIP_EXTENSIONS = new Set(['.gif', '.svg', '.ico', '.mp4', '.mov', '.pdf']);
let ImagePreviewService = ImagePreviewService_1 = class ImagePreviewService {
    storage;
    logger = new common_1.Logger(ImagePreviewService_1.name);
    constructor(storage) {
        this.storage = storage;
    }
    isPreviewableImage(mimeType, fileName) {
        const mime = mimeType?.toLowerCase().trim() ?? '';
        if (mime.startsWith('video/') || mime === 'application/pdf') {
            return false;
        }
        if (mime === 'image/gif' || mime === 'image/svg+xml' || mime === 'image/x-icon') {
            return false;
        }
        if (PREVIEWABLE_MIME_TYPES.has(mime)) {
            return true;
        }
        const extension = this.extensionOf(fileName);
        if (!extension)
            return mime.startsWith('image/');
        if (SKIP_EXTENSIONS.has(extension))
            return false;
        return ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.avif'].includes(extension);
    }
    toPreviewStoragePath(originalPath) {
        const lastSlash = originalPath.lastIndexOf('/');
        const directory = lastSlash >= 0 ? originalPath.slice(0, lastSlash + 1) : '';
        const filename = lastSlash >= 0 ? originalPath.slice(lastSlash + 1) : originalPath;
        const lastDot = filename.lastIndexOf('.');
        const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
        return `${directory}${base}.preview.webp`;
    }
    async toWebpBuffer(input) {
        if (!input.length)
            return null;
        try {
            return await (0, sharp_1.default)(input, {
                failOn: 'none',
                limitInputPixels: 50_000_000,
                animated: false,
            })
                .rotate()
                .resize({
                width: exports.IMAGE_PREVIEW_MAX_EDGE,
                height: exports.IMAGE_PREVIEW_MAX_EDGE,
                fit: 'inside',
                withoutEnlargement: true,
            })
                .webp({ quality: exports.IMAGE_PREVIEW_QUALITY, effort: 4 })
                .toBuffer();
        }
        catch (error) {
            this.logger.warn(`Failed to convert image preview: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    async persistPreviewFromBuffer(input) {
        if (!this.isPreviewableImage(input.mimeType, input.fileName ?? input.originalPath)) {
            return null;
        }
        const preview = await this.toWebpBuffer(input.body);
        if (!preview)
            return null;
        const previewPath = this.toPreviewStoragePath(input.originalPath);
        if (this.storage.isConfigured && input.bucket) {
            try {
                return await this.storage.uploadDeliverableObject({
                    bucket: input.bucket,
                    path: previewPath,
                    body: preview,
                    contentType: 'image/webp',
                });
            }
            catch (error) {
                this.logger.warn(`Failed to upload image preview: ${error instanceof Error ? error.message : String(error)}`);
                return null;
            }
        }
        return this.writeLocalPreview(previewPath, preview);
    }
    async persistPreviewFromStored(input) {
        if (!this.isPreviewableImage(input.mimeType, input.fileName ?? input.mediaUrl)) {
            return null;
        }
        const stored = await this.readStoredOriginal(input.mediaUrl);
        if (!stored)
            return null;
        return this.persistPreviewFromBuffer({
            body: stored.body,
            mimeType: input.mimeType,
            fileName: input.fileName,
            originalPath: stored.path,
            bucket: stored.bucket,
        });
    }
    async readStoredOriginal(mediaUrl) {
        const location = this.storage.extractStorageLocation(mediaUrl);
        if (location && this.storage.isConfigured) {
            const body = await this.storage.downloadObject(location.bucket, location.path);
            if (!body)
                return null;
            return { body, path: location.path, bucket: location.bucket };
        }
        const absolute = this.resolveLocalUploadPath(mediaUrl);
        if (!absolute || !(0, fs_1.existsSync)(absolute))
            return null;
        return {
            body: (0, fs_1.readFileSync)(absolute),
            path: path_1.posix.basename(mediaUrl),
            bucket: null,
        };
    }
    writeLocalPreview(previewPath, body) {
        const filename = path_1.posix.basename(previewPath);
        const absolute = (0, path_1.join)(process.cwd(), 'uploads', filename);
        (0, fs_1.writeFileSync)(absolute, body);
        return `/uploads/${filename}`;
    }
    resolveLocalUploadPath(mediaUrl) {
        if (!mediaUrl.startsWith('/uploads/'))
            return null;
        const uploadsRoot = (0, path_1.resolve)(process.cwd(), 'uploads');
        const absolute = (0, path_1.resolve)(process.cwd(), mediaUrl.replace(/^\//, ''));
        if (absolute !== uploadsRoot && !absolute.startsWith(uploadsRoot + path_1.sep)) {
            return null;
        }
        return absolute;
    }
    extensionOf(fileName) {
        if (!fileName)
            return '';
        const base = fileName.split(/[?#]/)[0] ?? fileName;
        const lastDot = base.lastIndexOf('.');
        if (lastDot < 0)
            return '';
        return base.slice(lastDot).toLowerCase();
    }
};
exports.ImagePreviewService = ImagePreviewService;
exports.ImagePreviewService = ImagePreviewService = ImagePreviewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_storage_service_1.SupabaseStorageService])
], ImagePreviewService);
//# sourceMappingURL=image-preview.service.js.map