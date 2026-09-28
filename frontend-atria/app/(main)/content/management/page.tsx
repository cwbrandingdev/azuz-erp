import { Suspense } from "react";
import { ContentManagementDashboard } from "@/components/content/content-management-dashboard";

export default function ContentManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      }
    >
      <ContentManagementDashboard />
    </Suspense>
  );
}
