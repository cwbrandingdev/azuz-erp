"use client";

import { BarChart2 } from "lucide-react";
import { MetaAnalyticsDashboard } from "@/components/meta-analytics/meta-analytics-dashboard";

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
            Performance real das contas de anúncios da agência e dos clientes
          </p>
        </div>
      </div>

      <MetaAnalyticsDashboard />
    </div>
  );
}
