import { resolveApiBaseUrl } from "@/lib/api-url";
import { isTenantSlug } from "./tenant-host";

const LOOKUP_TTL_MS = 30_000;
const LOOKUP_TIMEOUT_MS = 2_500;

type CachedLookup = {
  exists: boolean;
  expiresAt: number;
};

const lookupCache = new Map<string, CachedLookup>();

export async function tenantExists(slug: string): Promise<boolean | null> {
  if (!isTenantSlug(slug)) {
    return false;
  }

  const cached = lookupCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.exists;
  }

  try {
    const response = await fetch(
      `${resolveApiBaseUrl()}/tenants/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      },
    );

    if (response.status === 404) {
      remember(slug, false);
      return false;
    }

    if (!response.ok) {
      return null;
    }

    remember(slug, true);
    return true;
  } catch {
    return null;
  }
}

function remember(slug: string, exists: boolean) {
  lookupCache.set(slug, {
    exists,
    expiresAt: Date.now() + LOOKUP_TTL_MS,
  });
}
