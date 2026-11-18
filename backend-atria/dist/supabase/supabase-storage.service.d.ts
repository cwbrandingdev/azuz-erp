import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
export declare class SupabaseStorageService {
    private readonly supabase;
    private readonly configService;
    private r2Client;
    constructor(supabase: SupabaseService, configService: ConfigService);
    get isConfigured(): boolean;
    getAvatarBucket(): string;
    ensurePublicBucket(bucket: string): Promise<void>;
    uploadPublicObject(input: {
        bucket: string;
        path: string;
        body: Buffer;
        contentType: string;
        upsert?: boolean;
    }): Promise<string>;
    downloadObject(bucket: string, path: string): Promise<Buffer | null>;
    removeObject(bucket: string, path: string): Promise<void>;
    extractObjectPathFromPublicUrl(publicUrl: string, bucket: string): string | null;
    extractStorageLocation(mediaUrl: string): {
        bucket: string;
        path: string;
    } | null;
    createSignedDownloadUrl(input: {
        bucket: string;
        path: string;
        expiresInSeconds?: number;
        downloadFileName?: string;
    }): Promise<{
        signedUrl: string;
        expiresAt: string;
    }>;
    getDeliverablesBucket(): string;
    getFinancialAttachmentsBucket(): string;
    ensureFinancialBucket(bucket: string): Promise<void>;
    uploadFinancialObject(input: {
        bucket: string;
        path: string;
        body: Buffer;
        contentType: string;
        upsert?: boolean;
    }): Promise<string>;
    ensureDeliverablesBucket(bucket: string): Promise<void>;
    uploadDeliverableObject(input: {
        bucket: string;
        path: string;
        body: Buffer;
        contentType: string;
        upsert?: boolean;
    }): Promise<string>;
    private get storageProvider();
    private get r2PublicBaseUrl();
    private get r2Config();
    private getR2Client;
    private uploadToR2;
    private downloadFromR2;
    private removeFromR2;
    private createR2SignedDownloadUrl;
}
