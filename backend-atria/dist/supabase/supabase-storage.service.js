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
exports.SupabaseStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const upload_limits_1 = require("../common/upload/upload-limits");
const supabase_service_1 = require("./supabase.service");
let SupabaseStorageService = class SupabaseStorageService {
    supabase;
    configService;
    constructor(supabase, configService) {
        this.supabase = supabase;
        this.configService = configService;
    }
    get isConfigured() {
        return this.supabase.isConfigured;
    }
    getAvatarBucket() {
        return (this.configService.get('SUPABASE_STORAGE_BUCKET')?.trim() ||
            'avatars');
    }
    async ensurePublicBucket(bucket) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        const { data: buckets, error: listError } = await this.supabase.admin.storage.listBuckets();
        if (listError) {
            throw new common_1.BadRequestException(`Failed to list storage buckets: ${listError.message}`);
        }
        const exists = buckets?.some((item) => item.name === bucket);
        if (exists)
            return;
        const { error: createError } = await this.supabase.admin.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
            allowedMimeTypes: [
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/webp',
                'image/svg+xml',
                'image/x-icon',
                'image/vnd.microsoft.icon',
            ],
        });
        if (createError && !/already exists/i.test(createError.message)) {
            throw new common_1.BadRequestException(`Failed to create storage bucket: ${createError.message}`);
        }
    }
    async uploadPublicObject(input) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        await this.ensurePublicBucket(input.bucket);
        const { error } = await this.supabase.admin.storage
            .from(input.bucket)
            .upload(input.path, input.body, {
            contentType: input.contentType,
            upsert: input.upsert ?? true,
            cacheControl: '3600',
        });
        if (error) {
            throw new common_1.BadRequestException(`Failed to upload file to storage: ${error.message}`);
        }
        const { data } = this.supabase.admin.storage
            .from(input.bucket)
            .getPublicUrl(input.path);
        if (!data?.publicUrl) {
            throw new common_1.BadRequestException('Failed to resolve public storage URL');
        }
        return data.publicUrl;
    }
    async removeObject(bucket, path) {
        if (!this.supabase.isConfigured || !path)
            return;
        const { error } = await this.supabase.admin.storage
            .from(bucket)
            .remove([path]);
        if (error) {
            throw new common_1.BadRequestException(`Failed to remove file from storage: ${error.message}`);
        }
    }
    extractObjectPathFromPublicUrl(publicUrl, bucket) {
        try {
            const url = new URL(publicUrl);
            const marker = `/storage/v1/object/public/${bucket}/`;
            const index = url.pathname.indexOf(marker);
            if (index === -1)
                return null;
            return decodeURIComponent(url.pathname.slice(index + marker.length));
        }
        catch {
            return null;
        }
    }
    extractStorageLocation(mediaUrl) {
        try {
            const url = new URL(mediaUrl);
            const publicMarker = '/storage/v1/object/public/';
            const signMarker = '/storage/v1/object/sign/';
            const pathname = url.pathname;
            for (const marker of [publicMarker, signMarker]) {
                const index = pathname.indexOf(marker);
                if (index === -1)
                    continue;
                const remainder = decodeURIComponent(pathname.slice(index + marker.length));
                const slash = remainder.indexOf('/');
                if (slash <= 0)
                    return null;
                return {
                    bucket: remainder.slice(0, slash),
                    path: remainder.slice(slash + 1).split('?')[0] ?? '',
                };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async createSignedDownloadUrl(input) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        const expiresIn = input.expiresInSeconds ?? 60 * 15;
        const { data, error } = await this.supabase.admin.storage
            .from(input.bucket)
            .createSignedUrl(input.path, expiresIn, {
            download: input.downloadFileName?.trim() || true,
        });
        if (error || !data?.signedUrl) {
            throw new common_1.BadRequestException(`Failed to create signed download URL: ${error?.message ?? 'unknown error'}`);
        }
        return {
            signedUrl: data.signedUrl,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        };
    }
    getDeliverablesBucket() {
        return (this.configService.get('SUPABASE_DELIVERABLES_BUCKET')?.trim() ||
            'deliverables');
    }
    getFinancialAttachmentsBucket() {
        return (this.configService.get('SUPABASE_FINANCIAL_BUCKET')?.trim() ||
            'financial-attachments');
    }
    async ensureFinancialBucket(bucket) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        const { data: buckets, error: listError } = await this.supabase.admin.storage.listBuckets();
        if (listError) {
            throw new common_1.BadRequestException(`Failed to list storage buckets: ${listError.message}`);
        }
        const exists = buckets?.some((item) => item.name === bucket);
        if (exists) {
            const { error: updateError } = await this.supabase.admin.storage.updateBucket(bucket, {
                public: true,
                fileSizeLimit: upload_limits_1.UPLOAD_MAX_FILE_SIZE_BYTES,
            });
            if (updateError) {
                console.warn(`[storage] Could not raise ${bucket} size limit to ${upload_limits_1.UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB: ${updateError.message}`);
            }
            return;
        }
        const { error: createError } = await this.supabase.admin.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: upload_limits_1.UPLOAD_MAX_FILE_SIZE_BYTES,
            allowedMimeTypes: [
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/webp',
                'image/gif',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
        });
        if (createError && !/already exists/i.test(createError.message)) {
            throw new common_1.BadRequestException(`Failed to create storage bucket: ${createError.message}`);
        }
    }
    async uploadFinancialObject(input) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        await this.ensureFinancialBucket(input.bucket);
        const { error } = await this.supabase.admin.storage
            .from(input.bucket)
            .upload(input.path, input.body, {
            contentType: input.contentType,
            upsert: input.upsert ?? true,
            cacheControl: '3600',
        });
        if (error) {
            throw new common_1.BadRequestException(`Failed to upload file to storage: ${error.message}`);
        }
        const { data } = this.supabase.admin.storage
            .from(input.bucket)
            .getPublicUrl(input.path);
        if (!data?.publicUrl) {
            throw new common_1.BadRequestException('Failed to resolve public storage URL');
        }
        return data.publicUrl;
    }
    async ensureDeliverablesBucket(bucket) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        const { data: buckets, error: listError } = await this.supabase.admin.storage.listBuckets();
        if (listError) {
            throw new common_1.BadRequestException(`Failed to list storage buckets: ${listError.message}`);
        }
        const exists = buckets?.some((item) => item.name === bucket);
        if (exists) {
            const { error: updateError } = await this.supabase.admin.storage.updateBucket(bucket, {
                public: true,
                fileSizeLimit: upload_limits_1.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES,
            });
            if (updateError) {
                console.warn(`[storage] Could not raise ${bucket} size limit to ${upload_limits_1.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES / (1024 * 1024)}MB: ${updateError.message}`);
            }
            return;
        }
        const { error: createError } = await this.supabase.admin.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: upload_limits_1.UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES,
            allowedMimeTypes: [
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/webp',
                'image/gif',
                'application/pdf',
                'video/mp4',
                'video/quicktime',
            ],
        });
        if (createError && !/already exists/i.test(createError.message)) {
            throw new common_1.BadRequestException(`Failed to create storage bucket: ${createError.message}`);
        }
    }
    async uploadDeliverableObject(input) {
        if (!this.supabase.isConfigured) {
            throw new common_1.ServiceUnavailableException('Supabase Storage is not configured');
        }
        await this.ensureDeliverablesBucket(input.bucket);
        const { error } = await this.supabase.admin.storage
            .from(input.bucket)
            .upload(input.path, input.body, {
            contentType: input.contentType,
            upsert: input.upsert ?? true,
            cacheControl: '3600',
        });
        if (error) {
            throw new common_1.BadRequestException(`Failed to upload file to storage: ${error.message}`);
        }
        const { data } = this.supabase.admin.storage
            .from(input.bucket)
            .getPublicUrl(input.path);
        if (!data?.publicUrl) {
            throw new common_1.BadRequestException('Failed to resolve public storage URL');
        }
        return data.publicUrl;
    }
};
exports.SupabaseStorageService = SupabaseStorageService;
exports.SupabaseStorageService = SupabaseStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        config_1.ConfigService])
], SupabaseStorageService);
//# sourceMappingURL=supabase-storage.service.js.map