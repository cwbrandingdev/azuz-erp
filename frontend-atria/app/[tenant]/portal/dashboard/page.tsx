"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ClientPortalApp } from "@/components/portal/client-portal-app";
import { usePortalAuth } from "@/contexts/portal-auth-context";

function PortalDashboardContent() {
  return <ClientPortalApp />;
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = usePortalAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/portal/login");
      return;
    }
    if (!loading) setReady(true);
  }, [isAuthenticated, loading, router]);

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
        </div>
      }
    >
      <PortalDashboardContent />
    </Suspense>
  );
}
