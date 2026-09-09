export const TENANT_SLUG_HEADER = "x-tenant-slug";
export const FORWARDED_HOST_HEADER = "x-forwarded-host";
export const PUBLIC_SURFACE_HEADER = "x-atria-public-surface";
export const APEX_TENANT_SEGMENT = "_";
export const TENANT_NOT_FOUND_PATH = "/tenant-not-found";

export function getRootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "")
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, "");
}

export function getAllowedDevOrigins(): string[] {
  const host = stripPort(getRootDomain());
  if (!host) {
    return [];
  }
  return [host, `*.${host}`];
}

export function extractSubdomainLabel(
  hostHeader: string | null | undefined,
  rootDomain = getRootDomain(),
): string | null {
  const host = firstHost(hostHeader);
  const root = rootDomain.trim().toLowerCase().replace(/^\.+/, "");
  if (!host || !root) {
    return null;
  }

  return (
    matchSubdomainLabel(host, root) ??
    matchSubdomainLabel(stripPort(host), stripPort(root))
  );
}

export function extractTenantSlugFromHost(
  hostHeader: string | null | undefined,
  rootDomain = getRootDomain(),
): string | null {
  const label = extractSubdomainLabel(hostHeader, rootDomain);
  if (!label || !isTenantSlug(label)) {
    return null;
  }
  return label;
}

export function isTenantSlug(value: string): boolean {
  if (value === "www" || value === APEX_TENANT_SEGMENT) {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export function resolveRootOrigin(): string {
  const root = getRootDomain();
  if (typeof window !== "undefined") {
    const host = root || window.location.host;
    return `${window.location.protocol}//${host}`;
  }
  if (!root) {
    return "";
  }
  return `${inferRootProtocol(root)}//${root}`;
}

function inferRootProtocol(root: string): string {
  const host = stripPort(root);
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return "http:";
  }
  return "https:";
}

function matchSubdomainLabel(host: string, root: string): string | null {
  if (host === root) {
    return null;
  }
  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) {
    return null;
  }
  const remainder = host.slice(0, -suffix.length);
  const label = remainder.split(".")[0]?.trim().toLowerCase();
  return label || null;
}

function firstHost(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) {
    return null;
  }
  const value = hostHeader.split(",")[0]?.trim().toLowerCase();
  return value || null;
}

function stripPort(host: string): string {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end > 1) {
      return host.slice(1, end);
    }
  }
  return host.replace(/:\d+$/, "");
}
