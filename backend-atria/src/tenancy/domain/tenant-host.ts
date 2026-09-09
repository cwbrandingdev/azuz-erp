export const TENANT_SLUG_HEADER = 'x-tenant-slug';
export const FORWARDED_HOST_HEADER = 'x-forwarded-host';

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^\[?[0-9a-f:]+\]?$/i;

export function parseBaseDomains(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const seen = new Set<string>();
  const domains: string[] = [];

  for (const part of raw.split(',')) {
    const domain = normalizeBaseDomain(part);
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    domains.push(domain);
  }

  return domains.sort((left, right) => right.length - left.length);
}

export function normalizeBaseDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  try {
    const candidate = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    const hostname = new URL(candidate).hostname.trim().toLowerCase();
    return hostname.replace(/^\.+/, '') || null;
  } catch {
    const fallback = trimmed.replace(/^\.+/, '').replace(/:\d+$/, '');
    return fallback || null;
  }
}

export function readHostHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const forwarded = firstHeaderValue(headers[FORWARDED_HOST_HEADER]);
  if (forwarded) {
    return forwarded;
  }
  return firstHeaderValue(headers.host);
}

export function readExplicitTenantSlug(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const value = firstHeaderValue(headers[TENANT_SLUG_HEADER])?.toLowerCase();
  if (!value || !isTenantSlug(value)) {
    return null;
  }
  return value;
}

export function isTenantAwareCorsOrigin(
  origin: string,
  baseDomains: readonly string[],
): boolean {
  try {
    const url = new URL(origin);
    if (extractTenantSlug(url.host, baseDomains)) {
      return true;
    }
    const hostname = url.hostname.trim().toLowerCase();
    return baseDomains.some(
      (base) => normalizeBaseDomain(base) === hostname,
    );
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
  baseDomains: readonly string[],
): boolean {
  if (!origin || allowedOrigins.includes(origin)) {
    return true;
  }
  return isTenantAwareCorsOrigin(origin, baseDomains);
}

export function extractTenantSlug(
  hostHeader: string | undefined,
  baseDomains: readonly string[],
): string | null {
  const hostname = parseHostname(hostHeader);
  if (!hostname || isIpAddress(hostname)) {
    return null;
  }

  const domains = [...baseDomains]
    .map((domain) => normalizeBaseDomain(domain))
    .filter((domain): domain is string => Boolean(domain))
    .sort((left, right) => right.length - left.length);

  for (const base of domains) {
    if (hostname === base) {
      return null;
    }

    const suffix = `.${base}`;
    if (!hostname.endsWith(suffix)) {
      continue;
    }

    const remainder = hostname.slice(0, -suffix.length);
    const slug = remainder.split('.')[0]?.trim().toLowerCase();
    if (!slug || !isTenantSlug(slug)) {
      return null;
    }
    return slug;
  }

  return null;
}

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.split(',')[0]?.trim() || undefined;
}

function parseHostname(hostHeader: string | undefined): string | null {
  if (!hostHeader) {
    return null;
  }

  const first = hostHeader.split(',')[0]?.trim().toLowerCase();
  if (!first) {
    return null;
  }

  if (first.startsWith('[')) {
    const end = first.indexOf(']');
    if (end > 1) {
      return first.slice(1, end);
    }
  }

  return first.replace(/:\d+$/, '') || null;
}

function isIpAddress(hostname: string): boolean {
  return IPV4_PATTERN.test(hostname) || IPV6_PATTERN.test(hostname);
}

export function isTenantSlug(slug: string): boolean {
  if (slug === 'www') {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);
}
