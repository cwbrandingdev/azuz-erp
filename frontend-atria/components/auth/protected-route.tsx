"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute } from "@/lib/navigation-access";
import { shouldBlockCrmRoutes } from "@/lib/crm-access";
import {
  getHomePathForRole,
  isClientRole,
  isExternalCrmRole,
} from "@/lib/roles";

function isNavigationSettingsPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/settings" ||
    pathname === "/settings/navigation" ||
    pathname.startsWith("/settings/navigation/")
  );
}

function isExternalCrmAllowedPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/leads") ||
    pathname === "/jhonatan-calendar" ||
    pathname.startsWith("/jhonatan-calendar/")
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowNavigationSettings = isNavigationSettingsPath(pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isClientRole(user?.role)) {
      router.replace("/client-portal");
      return;
    }
    if (isExternalCrmRole(user?.role)) {
      if (shouldBlockCrmRoutes(user?.role, user?.hasCrmEnabled)) {
        if (isExternalCrmAllowedPath(pathname)) {
          router.replace("/client-portal");
        }
        return;
      }
      if (!isExternalCrmAllowedPath(pathname) && !allowNavigationSettings) {
        router.replace("/leads/kanban");
      }
      return;
    }
    if (
      user &&
      !canAccessRoute(user.role, pathname, user.permissions)
    ) {
      router.replace(getHomePathForRole(user.role, user.hasCrmEnabled));
    }
  }, [
    allowNavigationSettings,
    isAuthenticated,
    isLoading,
    pathname,
    router,
    user,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F6]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#004949] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || isClientRole(user?.role)) {
    return null;
  }

  if (isExternalCrmRole(user?.role)) {
    if (shouldBlockCrmRoutes(user?.role, user?.hasCrmEnabled)) {
      return null;
    }
    if (!isExternalCrmAllowedPath(pathname) && !allowNavigationSettings) {
      return null;
    }
    return <>{children}</>;
  }

  if (user && !canAccessRoute(user.role, pathname, user.permissions)) {
    return null;
  }

  return <>{children}</>;
}

export { getHomePathForRole };
