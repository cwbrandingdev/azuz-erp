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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramPublishMediaResolver = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const path_1 = require("path");
const supabase_storage_service_1 = require("../../supabase/supabase-storage.service");
const META_FETCH_EXPIRY_SECONDS = 60 * 60;
let InstagramPublishMediaResolver = class InstagramPublishMediaResolver {
    config;
    storage;
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
    }
    async resolvePublicImageUrl(rawUrl, postId) {
        const trimmed = rawUrl.trim();
        if (!trimmed) {
            throw new Error('URL de mídia vazia');
        }
        if (trimmed.startsWith('https://')) {
            return trimmed;
        }
        if (trimmed.startsWith('http://')) {
            const host = new URL(trimmed).hostname;
            if (host === 'localhost' || host === '127.0.0.1') {
                return this.mirrorLocalOrRelativeToSupabase(trimmed, postId);
            }
            return trimmed;
        }
        const location = this.storage.extractStorageLocation(trimmed);
        if (location) {
            return this.resolveSupabaseLocation(location);
        }
        if (trimmed.startsWith('/uploads/')) {
            return this.mirrorLocalOrRelativeToSupabase(trimmed, postId);
        }
        const apiBase = this.resolvePublicApiBase();
        if (apiBase) {
            const absolute = trimmed.startsWith('/')
                ? `${apiBase}${trimmed}`
                : `${apiBase}/${trimmed}`;
            const remoteLocation = this.storage.extractStorageLocation(absolute);
            if (remoteLocation) {
                return this.resolveSupabaseLocation(remoteLocation);
            }
            if (absolute.startsWith('https://')) {
                return absolute;
            }
            return this.mirrorLocalOrRelativeToSupabase(absolute, postId);
        }
        throw new Error('Mídia precisa estar em URL pública HTTPS (Supabase ou configure APP_URL)');
    }
    async resolveSupabaseLocation(location) {
        const publicUrl = this.buildPublicSupabaseUrl(location);
        if (publicUrl) {
            return publicUrl;
        }
        const signed = await this.storage.createSignedDownloadUrl({
            bucket: location.bucket,
            path: location.path,
            expiresInSeconds: META_FETCH_EXPIRY_SECONDS,
        });
        return signed.signedUrl;
    }
    buildPublicSupabaseUrl(location) {
        const supabaseUrl = this.config.get('SUPABASE_URL')?.trim();
        if (!supabaseUrl) {
            return null;
        }
        return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${location.bucket}/${location.path}`;
    }
    async mirrorLocalOrRelativeToSupabase(urlOrPath, postId) {
        if (!this.storage.isConfigured) {
            throw new Error('Configure Supabase Storage para publicar imagens locais no Instagram');
        }
        const filePath = urlOrPath.startsWith('http')
            ? this.pathFromApiUploadUrl(urlOrPath)
            : (0, path_1.join)(process.cwd(), urlOrPath.replace(/^\//, ''));
        if (!filePath || !(0, fs_1.existsSync)(filePath)) {
            throw new Error('Arquivo de mídia não encontrado para publicação');
        }
        const buffer = (0, fs_1.readFileSync)(filePath);
        const fileName = filePath.split('/').pop() ?? 'image.jpg';
        const contentType = this.guessContentType(fileName);
        const bucket = this.storage.getDeliverablesBucket();
        const objectPath = `instagram-publish/${postId}/${Date.now()}-${fileName}`;
        return this.storage.uploadDeliverableObject({
            bucket,
            path: objectPath,
            body: buffer,
            contentType,
            upsert: true,
        });
    }
    pathFromApiUploadUrl(url) {
        try {
            const parsed = new URL(url);
            if (!parsed.pathname.startsWith('/uploads/')) {
                return null;
            }
            return (0, path_1.join)(process.cwd(), parsed.pathname.replace(/^\//, ''));
        }
        catch {
            return null;
        }
    }
    resolvePublicApiBase() {
        const candidates = [
            this.config.get('PUBLIC_API_BASE_URL'),
            this.config.get('APP_URL'),
            this.config.get('TWILIO_WEBHOOK_BASE_URL'),
        ];
        for (const value of candidates) {
            const trimmed = value?.trim().replace(/\/$/, '');
            if (trimmed) {
                return trimmed;
            }
        }
        return null;
    }
    guessContentType(fileName) {
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.png'))
            return 'image/png';
        if (lower.endsWith('.webp'))
            return 'image/webp';
        if (lower.endsWith('.gif'))
            return 'image/gif';
        return 'image/jpeg';
    }
};
exports.InstagramPublishMediaResolver = InstagramPublishMediaResolver;
exports.InstagramPublishMediaResolver = InstagramPublishMediaResolver = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        supabase_storage_service_1.SupabaseStorageService])
], InstagramPublishMediaResolver);
//# sourceMappingURL=instagram-publish-media.resolver.js.map