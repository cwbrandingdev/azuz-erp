import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ClientPortalRoute } from "@/components/auth/client-portal-route";
import { RbacClientPortalApp } from "@/components/portal/rbac-client-portal-app";

export default function ClientPortalPage() {
  return (
    <ClientPortalRoute>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#F8F8F6]">
            <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
          </div>
        }
      >
        <RbacClientPortalApp />
      </Suspense>
    </ClientPortalRoute>
  );
}
