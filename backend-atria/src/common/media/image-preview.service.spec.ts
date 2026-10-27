import { ImagePreviewService } from './image-preview.service';
import sharp from 'sharp';

describe('ImagePreviewService', () => {
  const storage = {
    isConfigured: false,
    extractStorageLocation: jest.fn().mockReturnValue(null),
    downloadObject: jest.fn(),
    uploadDeliverableObject: jest.fn(),
  };
  const service = new ImagePreviewService(storage as never);

  it('accepts raster images and skips gif/video/pdf', () => {
    expect(service.isPreviewableImage('image/png', 'art.png')).toBe(true);
    expect(service.isPreviewableImage('image/jpeg', 'photo.jpg')).toBe(true);
    expect(service.isPreviewableImage('image/gif', 'anim.gif')).toBe(false);
    expect(service.isPreviewableImage('video/mp4', 'clip.mp4')).toBe(false);
    expect(service.isPreviewableImage('application/pdf', 'file.pdf')).toBe(false);
  });

  it('builds a sibling .preview.webp path', () => {
    expect(service.toPreviewStoragePath('client/task/abc.png')).toBe(
      'client/task/abc.preview.webp',
    );
    expect(service.toPreviewStoragePath('abc.jpeg')).toBe('abc.preview.webp');
  });

  it('converts a png buffer into a smaller webp preview', async () => {
    const png = await sharp({
      create: {
        width: 2400,
        height: 1800,
        channels: 3,
        background: { r: 20, g: 80, b: 160 },
      },
    })
      .png()
      .toBuffer();

    const webp = await service.toWebpBuffer(png);
    expect(webp).toBeTruthy();
    expect(webp!.length).toBeLessThan(png.length);

    const meta = await sharp(webp!).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(1600);
    expect(meta.height).toBeLessThanOrEqual(1600);
  });
});
