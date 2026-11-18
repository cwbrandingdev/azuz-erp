export type StorageLocation = {
    bucket: string;
    path: string;
};
export declare function normalizePublicBaseUrl(publicBaseUrl: string): string;
export declare function publicObjectUrl(publicBaseUrl: string, bucket: string, path: string): string;
export declare function r2ObjectKey(bucket: string, path: string): string;
export declare function extractStorageLocation(mediaUrl: string, r2PublicBaseUrl?: string | null): StorageLocation | null;
export declare function extractObjectPathFromPublicUrl(publicUrl: string, bucket: string, r2PublicBaseUrl?: string | null): string | null;
