import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SupabaseStorageService } from '../../supabase/supabase-storage.service';

const META_FETCH_EXPIRY_SECONDS = 60 * 60;

@Injectable()
export class InstagramPublishMediaResolver {
  constructor(
    private readonly config: ConfigService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async resolvePublicImageUrl(
    rawUrl: string,
    postId: string,
  ): Promise<string> {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      throw new Error('URL de mídia vazia');
    }

    if (trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (trimmed.startsWith('http://')) {
      const host = new URL(trimmed).hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return this.mirrorLocalOrRelativeToSupabase(trimmed, postId);
      }
      return trimmed;
    }

    const location = this.storage.extractStorageLocation(trimmed);
    if (location) {
      return this.resolveSupabaseLocation(location);
    }

    if (trimmed.startsWith('/uploads/')) {
      return this.mirrorLocalOrRelativeToSupabase(trimmed, postId);
    }

    const apiBase = this.resolvePublicApiBase();
    if (apiBase) {
      const absolute = trimmed.startsWith('/')
        ? `${apiBase}${trimmed}`
        : `${apiBase}/${trimmed}`;
      const remoteLocation = this.storage.extractStorageLocation(absolute);
      if (remoteLocation) {
        return this.resolveSupabaseLocation(remoteLocation);
      }
      if (absolute.startsWith('https://')) {
        return absolute;
      }
      return this.mirrorLocalOrRelativeToSupabase(absolute, postId);
    }

    throw new Error(
      'Mídia precisa estar em URL pública HTTPS (Supabase ou configure APP_URL)',
    );
  }

  private async resolveSupabaseLocation(location: {
    bucket: string;
    path: string;
  }): Promise<string> {
    const publicUrl = this.buildPublicSupabaseUrl(location);
    if (publicUrl) {
      return publicUrl;
    }

    const signed = await this.storage.createSignedDownloadUrl({
      bucket: location.bucket,
      path: location.path,
      expiresInSeconds: META_FETCH_EXPIRY_SECONDS,
    });
    return signed.signedUrl;
  }

  private buildPublicSupabaseUrl(location: {
    bucket: string;
    path: string;
  }): string | null {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    if (!supabaseUrl) {
      return null;
    }
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${location.bucket}/${location.path}`;
  }

  private async mirrorLocalOrRelativeToSupabase(
    urlOrPath: string,
    postId: string,
  ): Promise<string> {
    if (!this.storage.isConfigured) {
      throw new Error(
        'Configure Supabase Storage para publicar imagens locais no Instagram',
      );
    }

    const filePath = urlOrPath.startsWith('http')
      ? this.pathFromApiUploadUrl(urlOrPath)
      : join(process.cwd(), urlOrPath.replace(/^\//, ''));

    if (!filePath || !existsSync(filePath)) {
      throw new Error('Arquivo de mídia não encontrado para publicação');
    }

    const buffer = readFileSync(filePath);
    const fileName = filePath.split('/').pop() ?? 'image.jpg';
    const contentType = this.guessContentType(fileName);
    const bucket = this.storage.getDeliverablesBucket();
    const objectPath = `instagram-publish/${postId}/${Date.now()}-${fileName}`;

    return this.storage.uploadDeliverableObject({
      bucket,
      path: objectPath,
      body: buffer,
      contentType,
      upsert: true,
    });
  }

  private pathFromApiUploadUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (!parsed.pathname.startsWith('/uploads/')) {
        return null;
      }
      return join(process.cwd(), parsed.pathname.replace(/^\//, ''));
    } catch {
      return null;
    }
  }

  private resolvePublicApiBase(): string | null {
    const candidates = [
      this.config.get<string>('PUBLIC_API_BASE_URL'),
      this.config.get<string>('APP_URL'),
      this.config.get<string>('TWILIO_WEBHOOK_BASE_URL'),
    ];
    for (const value of candidates) {
      const trimmed = value?.trim().replace(/\/$/, '');
      if (trimmed) {
        return trimmed;
      }
    }
    return null;
  }

  private guessContentType(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }
}
