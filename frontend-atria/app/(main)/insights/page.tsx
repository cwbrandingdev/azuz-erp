import { Suspense } from "react";
import { BarChart2 } from "lucide-react";
import { ClientMetricsDashboard } from "@/components/instagram-insights/client-metrics-dashboard";

export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/20 p-3 text-[var(--atria-primary)]">
          <BarChart2 className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Meta Insights
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Crescimento de audiência e performance de conteúdo por cliente
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--atria-primary)]/5" />
        }
      >
        <ClientMetricsDashboard />
      </Suspense>
    </div>
  );
}
