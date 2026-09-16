"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute } from "@/lib/navigation-access";
import { getHomePathForRole } from "@/lib/roles";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (
      canAccessRoute(user?.role, "/settings/branding", user?.permissions)
    ) {
      router.replace("/settings/branding");
      return;
    }

    if (
      canAccessRoute(user?.role, "/settings/navigation", user?.permissions)
    ) {
      router.replace("/settings/navigation");
      return;
    }

    router.replace(getHomePathForRole(user?.role, user?.hasCrmEnabled));
  }, [isLoading, router, user?.hasCrmEnabled, user?.permissions, user?.role]);

  return null;
}
