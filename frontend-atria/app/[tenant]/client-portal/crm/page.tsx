import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ClientPortalRoute } from "@/components/auth/client-portal-route";
import { ClientPortalCrmContent } from "@/components/portal/client-portal-crm-content";

export default function ClientPortalCrmPage() {
  return (
    <ClientPortalRoute>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#F8F8F6]">
            <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
          </div>
        }
      >
        <ClientPortalCrmContent />
      </Suspense>
    </ClientPortalRoute>
  );
}
