import { ConfigService } from '@nestjs/config';
import { SupabaseStorageService } from '../../supabase/supabase-storage.service';
export declare class InstagramPublishMediaResolver {
    private readonly config;
    private readonly storage;
    constructor(config: ConfigService, storage: SupabaseStorageService);
    resolvePublicImageUrl(rawUrl: string, postId: string): Promise<string>;
    private resolveSupabaseLocation;
    private buildPublicSupabaseUrl;
    private mirrorLocalOrRelativeToSupabase;
    private pathFromApiUploadUrl;
    private resolvePublicApiBase;
    private guessContentType;
}
