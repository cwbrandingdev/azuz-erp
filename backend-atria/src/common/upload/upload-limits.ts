import { BadRequestException } from '@nestjs/common';

export const UPLOAD_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES = 150 * 1024 * 1024;

/** Multer accepts up to the largest per-type limit; enforce type-specific caps after upload. */
export const UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES =
  UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES;

export function isVideoMimeType(mimetype: string | undefined): boolean {
  return Boolean(mimetype?.startsWith('video/'));
}

export function getMaxUploadBytesForMimeType(
  mimetype: string | undefined,
): number {
  return isVideoMimeType(mimetype)
    ? UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES
    : UPLOAD_MAX_FILE_SIZE_BYTES;
}

export function assertUploadFileSize(file: Express.Multer.File): void {
  const maxBytes = getMaxUploadBytesForMimeType(file.mimetype);
  if (file.size <= maxBytes) {
    return;
  }

  const maxMb = maxBytes / (1024 * 1024);
  throw new BadRequestException(
    isVideoMimeType(file.mimetype)
      ? `O vídeo deve ter no máximo ${maxMb}MB.`
      : `O arquivo deve ter no máximo ${maxMb}MB.`,
  );
}
