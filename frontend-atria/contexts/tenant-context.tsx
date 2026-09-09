"use client";

import { createContext, useContext, useMemo } from "react";
import { extractTenantSlugFromHost } from "@/lib/tenancy/tenant-host";

type TenantContextValue = {
  slug: string | null;
};

const TenantContext = createContext<TenantContextValue>({ slug: null });

export function TenantProvider({
  slug,
  children,
}: {
  slug: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo<TenantContextValue>(
    () => ({
      slug:
        slug ??
        (typeof window === "undefined"
          ? null
          : extractTenantSlugFromHost(window.location.host)),
    }),
    [slug],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
