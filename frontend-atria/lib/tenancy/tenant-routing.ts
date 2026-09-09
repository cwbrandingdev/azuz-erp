import { tenantExists } from "./tenant-lookup";
import {
  APEX_TENANT_SEGMENT,
  extractSubdomainLabel,
  isTenantSlug,
  TENANT_NOT_FOUND_PATH,
} from "./tenant-host";

export type TenantRouteDecision = {
  slug: string | null;
  rewritePath: string | null;
  publicSurface: boolean;
};

export function shouldBypassTenantRewrite(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.json" ||
    pathname === TENANT_NOT_FOUND_PATH
  );
}

export function toTenantPath(pathname: string, tenantSegment: string): string {
  const prefix = `/${tenantSegment}`;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    return pathname;
  }
  return pathname === "/" ? prefix : `${prefix}${pathname}`;
}

export async function resolveTenantRoute(
  host: string | null,
  pathname: string,
): Promise<TenantRouteDecision> {
  const label = extractSubdomainLabel(host);

  if (!label || label === "www") {
    if (shouldBypassTenantRewrite(pathname) || pathname === "/") {
      return {
        slug: null,
        rewritePath: null,
        publicSurface: pathname === "/",
      };
    }

    return {
      slug: null,
      rewritePath: toTenantPath(pathname, APEX_TENANT_SEGMENT),
      publicSurface: false,
    };
  }

  if (!isTenantSlug(label)) {
    return missingTenant(null, pathname);
  }

  const exists = await tenantExists(label);
  if (exists === false) {
    return missingTenant(label, pathname);
  }

  if (shouldBypassTenantRewrite(pathname)) {
    return {
      slug: label,
      rewritePath: null,
      publicSurface: false,
    };
  }

  return {
    slug: label,
    rewritePath: toTenantPath(pathname, label),
    publicSurface: false,
  };
}

function missingTenant(
  slug: string | null,
  pathname: string,
): TenantRouteDecision {
  return {
    slug,
    rewritePath:
      pathname === TENANT_NOT_FOUND_PATH ? null : TENANT_NOT_FOUND_PATH,
    publicSurface: true,
  };
}
