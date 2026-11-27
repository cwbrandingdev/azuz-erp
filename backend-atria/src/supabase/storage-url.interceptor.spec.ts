import { rewriteLegacyUrls } from './storage-url.interceptor';

describe('rewriteLegacyUrls', () => {
  const rewrite = (url: string) => url.replace('supabase.example', 'r2.example');

  it('rewrites nested legacy storage urls and leaves other values', () => {
    const createdAt = new Date('2026-11-27T00:00:00.000Z');
    const body = {
      items: [
        {
          mediaUrl:
            'https://supabase.example/storage/v1/object/public/deliverables/file.mp4',
          note: 'keep this',
          createdAt,
        },
      ],
    };

    expect(rewriteLegacyUrls(body, rewrite)).toEqual({
      items: [
        {
          mediaUrl:
            'https://r2.example/storage/v1/object/public/deliverables/file.mp4',
          note: 'keep this',
          createdAt,
        },
      ],
    });
  });
});
