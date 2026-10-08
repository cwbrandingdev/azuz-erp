export declare const UPLOAD_MAX_FILE_SIZE_BYTES: number;
export declare const UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES: number;
export declare const UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES: number;
export declare function isVideoMimeType(mimetype: string | undefined): boolean;
export declare function getMaxUploadBytesForMimeType(mimetype: string | undefined): number;
export declare function assertUploadFileSize(file: Express.Multer.File): void;
