"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getHomePathForRole } from "@/lib/roles";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(
      isAuthenticated ? getHomePathForRole(user?.role) : "/login",
    );
  }, [isAuthenticated, isLoading, router, user?.role]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
    </div>
  );
}
