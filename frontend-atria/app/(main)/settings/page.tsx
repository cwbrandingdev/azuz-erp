"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessRoute } from "@/lib/navigation-access";

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

    router.replace("/settings/navigation");
  }, [isLoading, router, user?.permissions, user?.role]);

  return null;
}
