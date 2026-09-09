import {
  extractTenantSlugFromHost,
  FORWARDED_HOST_HEADER,
  TENANT_SLUG_HEADER,
} from "./tenant-host";

export { FORWARDED_HOST_HEADER, TENANT_SLUG_HEADER };

export function resolveTenantSlug(host?: string | null): string | null {
  if (host) {
    return extractTenantSlugFromHost(host);
  }
  if (typeof window !== "undefined") {
    return extractTenantSlugFromHost(window.location.host);
  }
  return null;
}

export function withTenantHeaders(
  init?: HeadersInit,
  host?: string | null,
): Headers {
  const headers = new Headers(init);
  const resolvedHost =
    host ?? (typeof window !== "undefined" ? window.location.host : null);

  if (!headers.has(TENANT_SLUG_HEADER)) {
    const slug = resolveTenantSlug(resolvedHost);
    if (slug) {
      headers.set(TENANT_SLUG_HEADER, slug);
    }
  }

  if (resolvedHost && !headers.has(FORWARDED_HOST_HEADER)) {
    headers.set(FORWARDED_HOST_HEADER, resolvedHost);
  }

  return headers;
}
