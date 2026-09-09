"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PortalFinanceDashboard } from "@/components/portal/portal-finance-dashboard";
import { usePortalAuth } from "@/contexts/portal-auth-context";
import { financeService, portalService } from "@/services";

export default function PortalFinancePage() {
  const router = useRouter();
  const { client, isAuthenticated, loading } = usePortalAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/portal/login");
      return;
    }
    if (!loading) setReady(true);
  }, [isAuthenticated, loading, router]);

  if (loading || !ready || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--atria-primary)]">
        Financeiro
      </h1>
      <PortalFinanceDashboard
        loadFinances={() =>
          financeService.getPublicClientFinances(client.id)
        }
        loadFinanceDocuments={() => portalService.listFinanceDocuments()}
        uploadFinanceDocument={(file) =>
          portalService.uploadFinanceDocument(file)
        }
        resolveAssetUrl={portalService.resolvePortalAssetUrl}
      />
    </div>
  );
}
