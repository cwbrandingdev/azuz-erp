import { Suspense } from "react";
import { MetaAdsReportPanel } from "@/components/meta-analytics/meta-ads-report-panel";

export default function AdsPage() {
  return (
    <div className="pb-8">
      <Suspense
        fallback={<div className="h-40 animate-pulse rounded-2xl bg-[var(--atria-primary)]/5" />}
      >
        <MetaAdsReportPanel />
      </Suspense>
    </div>
  );
}
