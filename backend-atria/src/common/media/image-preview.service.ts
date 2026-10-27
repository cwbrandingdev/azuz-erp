import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, posix, resolve, sep } from 'path';
import sharp from 'sharp';
import { SupabaseStorageService } from '../../supabase/supabase-storage.service';

export const IMAGE_PREVIEW_MAX_EDGE = 1600;
export const IMAGE_PREVIEW_QUALITY = 80;

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

@Injectable()
export class ImagePreviewService {
  private readonly logger = new Logger(ImagePreviewService.name);

  constructor(private readonly storage: SupabaseStorageService) {}

  isPreviewableImage(mimeType?: string | null, fileName?: string | null) {
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
    if (!extension) return mime.startsWith('image/');
    if (SKIP_EXTENSIONS.has(extension)) return false;
    return ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.avif'].includes(
      extension,
    );
  }

  toPreviewStoragePath(originalPath: string) {
    const lastSlash = originalPath.lastIndexOf('/');
    const directory = lastSlash >= 0 ? originalPath.slice(0, lastSlash + 1) : '';
    const filename = lastSlash >= 0 ? originalPath.slice(lastSlash + 1) : originalPath;
    const lastDot = filename.lastIndexOf('.');
    const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    return `${directory}${base}.preview.webp`;
  }

  async toWebpBuffer(input: Buffer): Promise<Buffer | null> {
    if (!input.length) return null;

    try {
      return await sharp(input, {
        failOn: 'none',
        limitInputPixels: 50_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width: IMAGE_PREVIEW_MAX_EDGE,
          height: IMAGE_PREVIEW_MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: IMAGE_PREVIEW_QUALITY, effort: 4 })
        .toBuffer();
    } catch (error) {
      this.logger.warn(
        `Failed to convert image preview: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async persistPreviewFromBuffer(input: {
    body: Buffer;
    mimeType?: string | null;
    fileName?: string | null;
    originalPath: string;
    bucket?: string | null;
  }): Promise<string | null> {
    if (!this.isPreviewableImage(input.mimeType, input.fileName ?? input.originalPath)) {
      return null;
    }

    const preview = await this.toWebpBuffer(input.body);
    if (!preview) return null;

    const previewPath = this.toPreviewStoragePath(input.originalPath);

    if (this.storage.isConfigured && input.bucket) {
      try {
        return await this.storage.uploadDeliverableObject({
          bucket: input.bucket,
          path: previewPath,
          body: preview,
          contentType: 'image/webp',
        });
      } catch (error) {
        this.logger.warn(
          `Failed to upload image preview: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    }

    return this.writeLocalPreview(previewPath, preview);
  }

  async persistPreviewFromStored(input: {
    mediaUrl: string;
    mimeType?: string | null;
    fileName?: string | null;
  }): Promise<string | null> {
    if (!this.isPreviewableImage(input.mimeType, input.fileName ?? input.mediaUrl)) {
      return null;
    }

    const stored = await this.readStoredOriginal(input.mediaUrl);
    if (!stored) return null;

    return this.persistPreviewFromBuffer({
      body: stored.body,
      mimeType: input.mimeType,
      fileName: input.fileName,
      originalPath: stored.path,
      bucket: stored.bucket,
    });
  }

  private async readStoredOriginal(mediaUrl: string): Promise<{
    body: Buffer;
    path: string;
    bucket: string | null;
  } | null> {
    const location = this.storage.extractStorageLocation(mediaUrl);
    if (location && this.storage.isConfigured) {
      const body = await this.storage.downloadObject(location.bucket, location.path);
      if (!body) return null;
      return { body, path: location.path, bucket: location.bucket };
    }

    const absolute = this.resolveLocalUploadPath(mediaUrl);
    if (!absolute || !existsSync(absolute)) return null;

    return {
      body: readFileSync(absolute),
      path: posix.basename(mediaUrl),
      bucket: null,
    };
  }

  private writeLocalPreview(previewPath: string, body: Buffer) {
    const filename = posix.basename(previewPath);
    const absolute = join(process.cwd(), 'uploads', filename);
    writeFileSync(absolute, body);
    return `/uploads/${filename}`;
  }

  private resolveLocalUploadPath(mediaUrl: string) {
    if (!mediaUrl.startsWith('/uploads/')) return null;
    const uploadsRoot = resolve(process.cwd(), 'uploads');
    const absolute = resolve(process.cwd(), mediaUrl.replace(/^\//, ''));
    if (absolute !== uploadsRoot && !absolute.startsWith(uploadsRoot + sep)) {
      return null;
    }
    return absolute;
  }

  private extensionOf(fileName?: string | null) {
    if (!fileName) return '';
    const base = fileName.split(/[?#]/)[0] ?? fileName;
    const lastDot = base.lastIndexOf('.');
    if (lastDot < 0) return '';
    return base.slice(lastDot).toLowerCase();
  }
}
