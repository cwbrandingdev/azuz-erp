import {
  extractObjectPathFromPublicUrl,
  extractStorageLocation,
  publicObjectUrl,
  r2ObjectKey,
} from './storage-url';

const R2_BASE = 'https://pub-1b35d92415fc4e6fbfe0af7fbd5a7ea4.r2.dev';

describe('storage urls', () => {
  it('builds an R2 public url with the bucket as a prefix', () => {
    expect(publicObjectUrl(R2_BASE, 'deliverables', 'acme/task/file.png')).toBe(
      `${R2_BASE}/deliverables/acme/task/file.png`,
    );
    expect(r2ObjectKey('deliverables', 'acme/task/file.png')).toBe(
      'deliverables/acme/task/file.png',
    );
  });

  it('reads a Supabase public url', () => {
    const mediaUrl =
      'https://sktjeijgyvulpzuzbmff.supabase.co/storage/v1/object/public/deliverables/acme/task/file.png';

    expect(extractStorageLocation(mediaUrl, R2_BASE)).toEqual({
      bucket: 'deliverables',
      path: 'acme/task/file.png',
    });
    expect(
      extractObjectPathFromPublicUrl(mediaUrl, 'deliverables', R2_BASE),
    ).toBe('acme/task/file.png');
  });

  it('reads an R2 public url', () => {
    const mediaUrl = `${R2_BASE}/avatars/users/photo%20a.png`;

    expect(extractStorageLocation(mediaUrl, `${R2_BASE}/`)).toEqual({
      bucket: 'avatars',
      path: 'users/photo a.png',
    });
    expect(extractObjectPathFromPublicUrl(mediaUrl, 'avatars', R2_BASE)).toBe(
      'users/photo a.png',
    );
    expect(
      extractObjectPathFromPublicUrl(mediaUrl, 'deliverables', R2_BASE),
    ).toBe(null);
  });

  it('ignores urls from another host', () => {
    expect(
      extractStorageLocation(
        'https://example.com/deliverables/file.png',
        R2_BASE,
      ),
    ).toBeNull();
  });
});
