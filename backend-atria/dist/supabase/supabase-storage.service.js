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
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const upload_limits_1 = require("../common/upload/upload-limits");
const storage_url_1 = require("./storage-url");
const supabase_service_1 = require("./supabase.service");
let SupabaseStorageService = class SupabaseStorageService {
    supabase;
    configService;
    r2Client = null;
    constructor(supabase, configService) {
        this.supabase = supabase;
        this.configService = configService;
    }
    get isConfigured() {
        if (this.storageProvider === 'r2')
            return this.r2Config !== null;
        return this.supabase.isConfigured;
    }
    getAvatarBucket() {
        return (this.configService.get('SUPABASE_STORAGE_BUCKET')?.trim() ||
            'avatars');
    }
    async ensurePublicBucket(bucket) {
        if (this.storageProvider === 'r2')
            return;
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
        if (this.storageProvider === 'r2')
            return this.uploadToR2(input);
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
    async downloadObject(bucket, path) {
        if (!path)
            return null;
        if (this.storageProvider === 'r2') {
            const fromR2 = await this.downloadFromR2(bucket, path);
            if (fromR2)
                return fromR2;
            if (!this.supabase.isConfigured)
                return null;
        }
        else if (!this.supabase.isConfigured) {
            return null;
        }
        const { data, error } = await this.supabase.admin.storage
            .from(bucket)
            .download(path);
        if (error || !data) {
            return null;
        }
        return Buffer.from(await data.arrayBuffer());
    }
    async removeObject(bucket, path) {
        if (!path)
            return;
        if (this.storageProvider === 'r2') {
            await this.removeFromR2(bucket, path);
            return;
        }
        if (!this.supabase.isConfigured)
            return;
        const { error } = await this.supabase.admin.storage
            .from(bucket)
            .remove([path]);
        if (error) {
            throw new common_1.BadRequestException(`Failed to remove file from storage: ${error.message}`);
        }
    }
    extractObjectPathFromPublicUrl(publicUrl, bucket) {
        return (0, storage_url_1.extractObjectPathFromPublicUrl)(publicUrl, bucket, this.r2PublicBaseUrl);
    }
    extractStorageLocation(mediaUrl) {
        return (0, storage_url_1.extractStorageLocation)(mediaUrl, this.r2PublicBaseUrl);
    }
    async createSignedDownloadUrl(input) {
        if (this.storageProvider === 'r2') {
            return this.createR2SignedDownloadUrl(input);
        }
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
        if (this.storageProvider === 'r2')
            return;
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
        if (this.storageProvider === 'r2')
            return this.uploadToR2(input);
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
        if (this.storageProvider === 'r2')
            return;
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
        if (this.storageProvider === 'r2')
            return this.uploadToR2(input);
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
    get storageProvider() {
        return this.configService.get('STORAGE_PROVIDER')?.trim() === 'r2'
            ? 'r2'
            : 'supabase';
    }
    get r2PublicBaseUrl() {
        return this.r2Config?.publicBaseUrl ?? null;
    }
    get r2Config() {
        const accountId = this.configService.get('R2_ACCOUNT_ID')?.trim();
        const accessKeyId = this.configService
            .get('R2_ACCESS_KEY_ID')
            ?.trim();
        const secretAccessKey = this.configService
            .get('R2_SECRET_ACCESS_KEY')
            ?.trim();
        const bucket = this.configService.get('R2_BUCKET')?.trim();
        const publicBaseUrl = this.configService
            .get('R2_PUBLIC_BASE_URL')
            ?.trim()
            .replace(/\/+$/, '');
        if (!accountId ||
            !accessKeyId ||
            !secretAccessKey ||
            !bucket ||
            !publicBaseUrl) {
            return null;
        }
        return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
    }
    getR2Client() {
        const config = this.r2Config;
        if (!config) {
            throw new common_1.ServiceUnavailableException('R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL.');
        }
        if (!this.r2Client) {
            this.r2Client = new client_s3_1.S3Client({
                region: 'auto',
                endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                },
                requestChecksumCalculation: 'WHEN_REQUIRED',
                responseChecksumValidation: 'WHEN_REQUIRED',
            });
        }
        return { client: this.r2Client, config };
    }
    async uploadToR2(input) {
        const { client, config } = this.getR2Client();
        try {
            await client.send(new client_s3_1.PutObjectCommand({
                Bucket: config.bucket,
                Key: (0, storage_url_1.r2ObjectKey)(input.bucket, input.path),
                Body: input.body,
                ContentType: input.contentType,
                CacheControl: '3600',
            }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            throw new common_1.BadRequestException(`Failed to upload file to R2: ${message}`);
        }
        return (0, storage_url_1.publicObjectUrl)(config.publicBaseUrl, input.bucket, input.path);
    }
    async downloadFromR2(bucket, path) {
        const { client, config } = this.getR2Client();
        try {
            const result = await client.send(new client_s3_1.GetObjectCommand({
                Bucket: config.bucket,
                Key: (0, storage_url_1.r2ObjectKey)(bucket, path),
            }));
            if (!result.Body)
                return null;
            return Buffer.from(await result.Body.transformToByteArray());
        }
        catch (error) {
            const status = error
                ?.$metadata?.httpStatusCode;
            const name = error.name;
            if (status === 404 || name === 'NoSuchKey' || name === 'NotFound') {
                return null;
            }
            return null;
        }
    }
    async removeFromR2(bucket, path) {
        const { client, config } = this.getR2Client();
        try {
            await client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: config.bucket,
                Key: (0, storage_url_1.r2ObjectKey)(bucket, path),
            }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            throw new common_1.BadRequestException(`Failed to remove file from R2: ${message}`);
        }
    }
    async createR2SignedDownloadUrl(input) {
        const { client, config } = this.getR2Client();
        const expiresIn = input.expiresInSeconds ?? 60 * 15;
        const filename = (input.downloadFileName?.trim() ||
            input.path.split('/').pop() ||
            'download').replace(/["\r\n]/g, '');
        try {
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.GetObjectCommand({
                Bucket: config.bucket,
                Key: (0, storage_url_1.r2ObjectKey)(input.bucket, input.path),
                ResponseContentDisposition: `attachment; filename="${filename}"`,
            }), { expiresIn });
            return {
                signedUrl,
                expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            throw new common_1.BadRequestException(`Failed to create signed download URL: ${message}`);
        }
    }
};
exports.SupabaseStorageService = SupabaseStorageService;
exports.SupabaseStorageService = SupabaseStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        config_1.ConfigService])
], SupabaseStorageService);
//# sourceMappingURL=supabase-storage.service.js.map