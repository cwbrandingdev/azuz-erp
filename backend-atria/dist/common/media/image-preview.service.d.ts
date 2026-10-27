import { SupabaseStorageService } from '../../supabase/supabase-storage.service';
export declare const IMAGE_PREVIEW_MAX_EDGE = 1600;
export declare const IMAGE_PREVIEW_QUALITY = 80;
export declare class ImagePreviewService {
    private readonly storage;
    private readonly logger;
    constructor(storage: SupabaseStorageService);
    isPreviewableImage(mimeType?: string | null, fileName?: string | null): boolean;
    toPreviewStoragePath(originalPath: string): string;
    toWebpBuffer(input: Buffer): Promise<Buffer | null>;
    persistPreviewFromBuffer(input: {
        body: Buffer;
        mimeType?: string | null;
        fileName?: string | null;
        originalPath: string;
        bucket?: string | null;
    }): Promise<string | null>;
    persistPreviewFromStored(input: {
        mediaUrl: string;
        mimeType?: string | null;
        fileName?: string | null;
    }): Promise<string | null>;
    private readStoredOriginal;
    private writeLocalPreview;
    private resolveLocalUploadPath;
    private extensionOf;
}
