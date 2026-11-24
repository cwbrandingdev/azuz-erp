import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/amr': '.amr',
  'video/mp4': '.mp4',
  'application/pdf': '.pdf',
};

@Injectable()
export class WhatsAppMediaStore {
  private readonly dir = join(process.cwd(), 'uploads', 'whatsapp');

  constructor() {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  /** WhatsApp stickers arrive as webp, sometimes animated. Normalize them so the inbox can render the image. */
  async saveSticker(
    buffer: Buffer,
    filename?: string | null,
    mimeType?: string | null,
  ) {
    try {
      const output = await sharp(buffer, { animated: true })
        .rotate()
        .resize({
          width: 512,
          height: 512,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80, effort: 3 })
        .toBuffer();
      return this.save(output, 'sticker.webp', 'image/webp');
    } catch {
      return this.save(buffer, filename, mimeType);
    }
  }

  save(buffer: Buffer, filename?: string | null, mimeType?: string | null) {
    const ext =
      (filename ? extname(filename) : '') ||
      (mimeType ? MIME_EXT[mimeType.split(';')[0].trim()] : '') ||
      '';
    const stored = `${randomUUID()}${ext}`;
    writeFileSync(join(this.dir, stored), buffer);
    return {
      url: `/uploads/whatsapp/${stored}`,
      absolutePath: join(this.dir, stored),
      filename: filename?.trim() || stored,
      mimeType: mimeType ?? null,
    };
  }

  resolvePath(url: string): string | null {
    if (!url.startsWith('/uploads/whatsapp/')) return null;
    const name = url.slice('/uploads/whatsapp/'.length);
    if (!name || name.includes('..') || name.includes('/')) return null;
    return join(this.dir, name);
  }
}
