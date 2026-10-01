import { ContentPostFormat } from '@prisma/client';
import { evaluateTaskPublishReadiness } from './meta-publish-readiness';

describe('evaluateTaskPublishReadiness', () => {
  const base = {
    clientId: 'c1',
    clientHasInstagram: true,
    clientHasMetaToken: true,
    publicationDate: new Date(Date.now() + 60 * 60 * 1000),
    format: ContentPostFormat.STATIC,
    media: [{ url: 'https://cdn.example.com/a.jpg', mimeType: 'image/jpeg' }],
    imageCount: 1,
    videoCount: 0,
    mediaUrlReachable: true,
  };

  it('passes when requirements are met', () => {
    const result = evaluateTaskPublishReadiness(base);
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it('blocks carousel with one image', () => {
    const result = evaluateTaskPublishReadiness({
      ...base,
      format: ContentPostFormat.CAROUSEL,
      imageCount: 1,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.code === 'carousel_images')).toBe(true);
  });
});
