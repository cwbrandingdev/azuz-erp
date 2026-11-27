import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES,
} from '../common/upload/upload-limits';
import {
  extractObjectPathFromPublicUrl,
  extractStorageLocation,
  publicObjectUrl,
  r2ObjectKey,
  rewriteLegacyStorageUrl,
} from './storage-url';
import { SupabaseService } from './supabase.service';

type StorageProvider = 'r2' | 'supabase';

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

@Injectable()
export class SupabaseStorageService {
  private r2Client: S3Client | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  get isConfigured(): boolean {
    if (this.storageProvider === 'r2') return this.r2Config !== null;
    return this.supabase.isConfigured;
  }

  getAvatarBucket(): string {
    return (
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ||
      'avatars'
    );
  }

  async ensurePublicBucket(bucket: string): Promise<void> {
    if (this.storageProvider === 'r2') return;
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

    const { error: createError } =
      await this.supabase.admin.storage.createBucket(bucket, {
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
    if (this.storageProvider === 'r2') return this.uploadToR2(input);

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

  async downloadObject(bucket: string, path: string): Promise<Buffer | null> {
    if (!path) return null;

    if (this.storageProvider === 'r2') {
      const fromR2 = await this.downloadFromR2(bucket, path);
      if (fromR2) return fromR2;
      if (!this.supabase.isConfigured) return null;
    } else if (!this.supabase.isConfigured) {
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

  async removeObject(bucket: string, path: string): Promise<void> {
    if (!path) return;

    if (this.storageProvider === 'r2') {
      await this.removeFromR2(bucket, path);
      return;
    }

    if (!this.supabase.isConfigured) return;

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
    return extractObjectPathFromPublicUrl(
      publicUrl,
      bucket,
      this.r2PublicBaseUrl,
    );
  }

  extractStorageLocation(mediaUrl: string): {
    bucket: string;
    path: string;
  } | null {
    return extractStorageLocation(mediaUrl, this.r2PublicBaseUrl);
  }

  get rewritesLegacyUrls(): boolean {
    return this.storageProvider === 'r2' && Boolean(this.r2PublicBaseUrl);
  }

  rewritePublicUrl(mediaUrl: string): string {
    if (!this.rewritesLegacyUrls || !this.r2PublicBaseUrl) return mediaUrl;
    return rewriteLegacyStorageUrl(mediaUrl, this.r2PublicBaseUrl);
  }

  async createSignedDownloadUrl(input: {
    bucket: string;
    path: string;
    expiresInSeconds?: number;
    downloadFileName?: string;
  }): Promise<{ signedUrl: string; expiresAt: string }> {
    if (this.storageProvider === 'r2') {
      return this.createR2SignedDownloadUrl(input);
    }

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
    if (this.storageProvider === 'r2') return;
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

    const { error: createError } =
      await this.supabase.admin.storage.createBucket(bucket, {
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
      });

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
    if (this.storageProvider === 'r2') return this.uploadToR2(input);

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
    if (this.storageProvider === 'r2') return;
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

    const { error: createError } =
      await this.supabase.admin.storage.createBucket(bucket, {
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
      });

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
    if (this.storageProvider === 'r2') return this.uploadToR2(input);

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

  private get storageProvider(): StorageProvider {
    return this.configService.get<string>('STORAGE_PROVIDER')?.trim() === 'r2'
      ? 'r2'
      : 'supabase';
  }

  private get r2PublicBaseUrl(): string | null {
    return this.r2Config?.publicBaseUrl ?? null;
  }

  private get r2Config(): R2Config | null {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID')?.trim();
    const accessKeyId = this.configService
      .get<string>('R2_ACCESS_KEY_ID')
      ?.trim();
    const secretAccessKey = this.configService
      .get<string>('R2_SECRET_ACCESS_KEY')
      ?.trim();
    const bucket = this.configService.get<string>('R2_BUCKET')?.trim();
    const publicBaseUrl = this.configService
      .get<string>('R2_PUBLIC_BASE_URL')
      ?.trim()
      .replace(/\/+$/, '');

    if (
      !accountId ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucket ||
      !publicBaseUrl
    ) {
      return null;
    }

    return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
  }

  private getR2Client(): { client: S3Client; config: R2Config } {
    const config = this.r2Config;
    if (!config) {
      throw new ServiceUnavailableException(
        'R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL.',
      );
    }

    if (!this.r2Client) {
      this.r2Client = new S3Client({
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

  private async uploadToR2(input: {
    bucket: string;
    path: string;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    const { client, config } = this.getR2Client();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: r2ObjectKey(input.bucket, input.path),
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: '3600',
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new BadRequestException(`Failed to upload file to R2: ${message}`);
    }

    return publicObjectUrl(config.publicBaseUrl, input.bucket, input.path);
  }

  private async downloadFromR2(
    bucket: string,
    path: string,
  ): Promise<Buffer | null> {
    const { client, config } = this.getR2Client();
    try {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: r2ObjectKey(bucket, path),
        }),
      );
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      const name = (error as { name?: string }).name;
      if (status === 404 || name === 'NoSuchKey' || name === 'NotFound') {
        return null;
      }
      return null;
    }
  }

  private async removeFromR2(bucket: string, path: string): Promise<void> {
    const { client, config } = this.getR2Client();
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: r2ObjectKey(bucket, path),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new BadRequestException(
        `Failed to remove file from R2: ${message}`,
      );
    }
  }

  private async createR2SignedDownloadUrl(input: {
    bucket: string;
    path: string;
    expiresInSeconds?: number;
    downloadFileName?: string;
  }): Promise<{ signedUrl: string; expiresAt: string }> {
    const { client, config } = this.getR2Client();
    const expiresIn = input.expiresInSeconds ?? 60 * 15;
    const filename = (
      input.downloadFileName?.trim() ||
      input.path.split('/').pop() ||
      'download'
    ).replace(/["\r\n]/g, '');

    try {
      const signedUrl = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: r2ObjectKey(input.bucket, input.path),
          ResponseContentDisposition: `attachment; filename="${filename}"`,
        }),
        { expiresIn },
      );

      return {
        signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new BadRequestException(
        `Failed to create signed download URL: ${message}`,
      );
    }
  }
}
