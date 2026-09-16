"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAppUpdatesAccess } from "@/hooks/use-app-updates";
import { canAccessRoute } from "@/lib/navigation-access";
import { isMasterRole } from "@/lib/permissions";
import { navSections, type NavSection } from "@/components/layout/navigation";

export function useVisibleNavSections() {
  const { user } = useAuth();
  const { data: appUpdatesAccess } = useAppUpdatesAccess();
  const appUpdatesBadgeCount = appUpdatesAccess?.unreadCount ?? 0;

  const sections = useMemo<NavSection[]>(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => {
            if (item.href === "/app-updates") {
              const canSeeAppUpdates =
                isMasterRole(user?.role) || appUpdatesAccess?.canView;
              if (!canSeeAppUpdates) {
                return null;
              }
            }

            if (!item.children?.length) {
              return canAccessRoute(user?.role, item.href, user?.permissions)
                ? item
                : null;
            }

            const children = item.children.filter((child) =>
              canAccessRoute(user?.role, child.href, user?.permissions),
            );

            if (children.length === 0) {
              return null;
            }

            return { ...item, children };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
      }))
      .filter((section) => section.items.length > 0);
  }, [
    appUpdatesAccess?.canView,
    appUpdatesAccess?.unreadCount,
    user?.permissions,
    user?.role,
  ]);

  return { sections, appUpdatesBadgeCount };
}

export function getNavItemBadgeCount(href: string, appUpdatesBadgeCount: number) {
  return href === "/app-updates" ? appUpdatesBadgeCount : 0;
}
