const SUPABASE_PUBLIC_MARKER = '/storage/v1/object/public/';
const SUPABASE_SIGN_MARKER = '/storage/v1/object/sign/';

export type StorageLocation = {
  bucket: string;
  path: string;
};

export function normalizePublicBaseUrl(publicBaseUrl: string): string {
  return publicBaseUrl.trim().replace(/\/+$/, '');
}

export function publicObjectUrl(
  publicBaseUrl: string,
  bucket: string,
  path: string,
): string {
  const base = normalizePublicBaseUrl(publicBaseUrl);
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base}/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export function r2ObjectKey(bucket: string, path: string): string {
  return `${bucket}/${path}`;
}

export function extractStorageLocation(
  mediaUrl: string,
  r2PublicBaseUrl?: string | null,
): StorageLocation | null {
  let url: URL;
  try {
    url = new URL(mediaUrl);
  } catch {
    return null;
  }

  const r2Location = extractR2Location(url, r2PublicBaseUrl);
  if (r2Location) return r2Location;

  const pathname = url.pathname;
  for (const marker of [SUPABASE_PUBLIC_MARKER, SUPABASE_SIGN_MARKER]) {
    const index = pathname.indexOf(marker);
    if (index === -1) continue;
    const remainder = decodeURIComponent(pathname.slice(index + marker.length));
    const slash = remainder.indexOf('/');
    if (slash <= 0) return null;
    const path = remainder.slice(slash + 1).split('?')[0] ?? '';
    if (!path) return null;
    return {
      bucket: remainder.slice(0, slash),
      path,
    };
  }

  return null;
}

export function extractObjectPathFromPublicUrl(
  publicUrl: string,
  bucket: string,
  r2PublicBaseUrl?: string | null,
): string | null {
  const location = extractStorageLocation(publicUrl, r2PublicBaseUrl);
  if (!location || location.bucket !== bucket) return null;
  return location.path;
}

function extractR2Location(
  url: URL,
  r2PublicBaseUrl?: string | null,
): StorageLocation | null {
  if (!r2PublicBaseUrl?.trim()) return null;

  let base: URL;
  try {
    base = new URL(normalizePublicBaseUrl(r2PublicBaseUrl));
  } catch {
    return null;
  }

  if (url.origin !== base.origin) return null;

  const basePath = base.pathname.replace(/\/+$/, '');
  if (!url.pathname.startsWith(basePath)) return null;

  const remainder = decodeURIComponent(
    url.pathname.slice(basePath.length).replace(/^\/+/, ''),
  ).split('?')[0];
  const slash = remainder.indexOf('/');
  if (slash <= 0) return null;
  const path = remainder.slice(slash + 1);
  if (!path) return null;
  return {
    bucket: remainder.slice(0, slash),
    path,
  };
}
