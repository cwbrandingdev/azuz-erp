import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES,
} from '../common/upload/upload-limits';
import { SupabaseService } from './supabase.service';

@Injectable()
export class SupabaseStorageService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  get isConfigured(): boolean {
    return this.supabase.isConfigured;
  }

  getAvatarBucket(): string {
    return (
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ||
      'avatars'
    );
  }

  async ensurePublicBucket(bucket: string): Promise<void> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
    }

    const { data: buckets, error: listError } =
      await this.supabase.admin.storage.listBuckets();

    if (listError) {
      throw new BadRequestException(
        `Failed to list storage buckets: ${listError.message}`,
      );
    }

    const exists = buckets?.some((item) => item.name === bucket);
    if (exists) return;

    const { error: createError } = await this.supabase.admin.storage.createBucket(
      bucket,
      {
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
      },
    );

    if (createError && !/already exists/i.test(createError.message)) {
      throw new BadRequestException(
        `Failed to create storage bucket: ${createError.message}`,
      );
    }
  }

  async uploadPublicObject(input: {
    bucket: string;
    path: string;
    body: Buffer;
    contentType: string;
    upsert?: boolean;
  }): Promise<string> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
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
      throw new BadRequestException(
        `Failed to upload file to storage: ${error.message}`,
      );
    }

    const { data } = this.supabase.admin.storage
      .from(input.bucket)
      .getPublicUrl(input.path);

    if (!data?.publicUrl) {
      throw new BadRequestException('Failed to resolve public storage URL');
    }

    return data.publicUrl;
  }

  async removeObject(bucket: string, path: string): Promise<void> {
    if (!this.supabase.isConfigured || !path) return;

    const { error } = await this.supabase.admin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new BadRequestException(
        `Failed to remove file from storage: ${error.message}`,
      );
    }
  }

  extractObjectPathFromPublicUrl(
    publicUrl: string,
    bucket: string,
  ): string | null {
    try {
      const url = new URL(publicUrl);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = url.pathname.indexOf(marker);
      if (index === -1) return null;
      return decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      return null;
    }
  }

  extractStorageLocation(mediaUrl: string): {
    bucket: string;
    path: string;
  } | null {
    try {
      const url = new URL(mediaUrl);
      const publicMarker = '/storage/v1/object/public/';
      const signMarker = '/storage/v1/object/sign/';
      const pathname = url.pathname;

      for (const marker of [publicMarker, signMarker]) {
        const index = pathname.indexOf(marker);
        if (index === -1) continue;
        const remainder = decodeURIComponent(
          pathname.slice(index + marker.length),
        );
        const slash = remainder.indexOf('/');
        if (slash <= 0) return null;
        return {
          bucket: remainder.slice(0, slash),
          path: remainder.slice(slash + 1).split('?')[0] ?? '',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async createSignedDownloadUrl(input: {
    bucket: string;
    path: string;
    expiresInSeconds?: number;
    downloadFileName?: string;
  }): Promise<{ signedUrl: string; expiresAt: string }> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
    }

    const expiresIn = input.expiresInSeconds ?? 60 * 15;
    const { data, error } = await this.supabase.admin.storage
      .from(input.bucket)
      .createSignedUrl(input.path, expiresIn, {
        download: input.downloadFileName?.trim() || true,
      });

    if (error || !data?.signedUrl) {
      throw new BadRequestException(
        `Failed to create signed download URL: ${error?.message ?? 'unknown error'}`,
      );
    }

    return {
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  getDeliverablesBucket(): string {
    return (
      this.configService.get<string>('SUPABASE_DELIVERABLES_BUCKET')?.trim() ||
      'deliverables'
    );
  }

  getFinancialAttachmentsBucket(): string {
    return (
      this.configService.get<string>('SUPABASE_FINANCIAL_BUCKET')?.trim() ||
      'financial-attachments'
    );
  }

  async ensureFinancialBucket(bucket: string): Promise<void> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
    }

    const { data: buckets, error: listError } =
      await this.supabase.admin.storage.listBuckets();

    if (listError) {
      throw new BadRequestException(
        `Failed to list storage buckets: ${listError.message}`,
      );
    }

    const exists = buckets?.some((item) => item.name === bucket);
    if (exists) {
      const { error: updateError } =
        await this.supabase.admin.storage.updateBucket(bucket, {
          public: true,
          fileSizeLimit: UPLOAD_MAX_FILE_SIZE_BYTES,
        });
      if (updateError) {
        console.warn(
          `[storage] Could not raise ${bucket} size limit to ${UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB: ${updateError.message}`,
        );
      }
      return;
    }

    const { error: createError } = await this.supabase.admin.storage.createBucket(
      bucket,
      {
        public: true,
        fileSizeLimit: UPLOAD_MAX_FILE_SIZE_BYTES,
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
      },
    );

    if (createError && !/already exists/i.test(createError.message)) {
      throw new BadRequestException(
        `Failed to create storage bucket: ${createError.message}`,
      );
    }
  }

  async uploadFinancialObject(input: {
    bucket: string;
    path: string;
    body: Buffer;
    contentType: string;
    upsert?: boolean;
  }): Promise<string> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
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
      throw new BadRequestException(
        `Failed to upload file to storage: ${error.message}`,
      );
    }

    const { data } = this.supabase.admin.storage
      .from(input.bucket)
      .getPublicUrl(input.path);

    if (!data?.publicUrl) {
      throw new BadRequestException('Failed to resolve public storage URL');
    }

    return data.publicUrl;
  }

  async ensureDeliverablesBucket(bucket: string): Promise<void> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
    }

    const { data: buckets, error: listError } =
      await this.supabase.admin.storage.listBuckets();

    if (listError) {
      throw new BadRequestException(
        `Failed to list storage buckets: ${listError.message}`,
      );
    }

    const exists = buckets?.some((item) => item.name === bucket);
    if (exists) {
      const { error: updateError } =
        await this.supabase.admin.storage.updateBucket(bucket, {
          public: true,
          fileSizeLimit: UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES,
        });
      if (updateError) {
        console.warn(
          `[storage] Could not raise ${bucket} size limit to ${UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES / (1024 * 1024)}MB: ${updateError.message}`,
        );
      }
      return;
    }

    const { error: createError } = await this.supabase.admin.storage.createBucket(
      bucket,
      {
        public: true,
        fileSizeLimit: UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES,
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
      },
    );

    if (createError && !/already exists/i.test(createError.message)) {
      throw new BadRequestException(
        `Failed to create storage bucket: ${createError.message}`,
      );
    }
  }

  async uploadDeliverableObject(input: {
    bucket: string;
    path: string;
    body: Buffer;
    contentType: string;
    upsert?: boolean;
  }): Promise<string> {
    if (!this.supabase.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured',
      );
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
      throw new BadRequestException(
        `Failed to upload file to storage: ${error.message}`,
      );
    }

    const { data } = this.supabase.admin.storage
      .from(input.bucket)
      .getPublicUrl(input.path);

    if (!data?.publicUrl) {
      throw new BadRequestException('Failed to resolve public storage URL');
    }

    return data.publicUrl;
  }
}
