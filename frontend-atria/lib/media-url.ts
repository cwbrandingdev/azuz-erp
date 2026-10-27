import { API_BASE_URL } from "@/services/api";

/** Resolve relative `/uploads/...` paths against the API host. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/** Prefer a generated WebP preview; fall back to the original file. */
export function resolveDisplayMediaUrl(
  previewUrl?: string | null,
  originalUrl?: string | null,
): string | null {
  return resolveMediaUrl(previewUrl) ?? resolveMediaUrl(originalUrl);
}

export function preferredDisplayUrl(item: {
  displayUrl?: string | null;
  previewUrl?: string | null;
  mediaUrl: string;
}): string {
  return item.displayUrl || item.previewUrl || item.mediaUrl;
}

export function itemDisplayUrl(item: {
  displayUrl?: string | null;
  previewUrl?: string | null;
  mediaUrl: string;
}): string {
  return resolveMediaUrl(preferredDisplayUrl(item)) ?? item.mediaUrl;
}

export function getInitials(name: string, fallback = "?"): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return parts || fallback;
}
