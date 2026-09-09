"use client";

import { useState } from "react";
import { PlatformFilter } from "@/app/[tenant]/(main)/resumos/components/PlatformFilter";
import { SummaryCard } from "@/app/[tenant]/(main)/resumos/components/SumaryCard";
import type { Platform } from "@/app/[tenant]/(main)/resumos/components/types";
import type { PerformanceSummary } from "@/services/types";

interface PerformanceDashboardProps {
  summaries: PerformanceSummary[];
  title?: string;
  subtitle?: string;
}

export function PerformanceDashboard({
  summaries,
  title = "Dashboard de Performance",
  subtitle = "Resumos detalhados com gráficos de crescimento e métricas de conversão",
}: PerformanceDashboardProps) {
  const [filter, setFilter] = useState<Platform>("all");

  const filteredSummaries = summaries.filter((item) => {
    if (filter === "all") return true;
    return item.platform === filter;
  });

  return (
    <div className="flex w-full max-w-7xl flex-col gap-6 rounded-3xl border border-[#013C3C]/10 bg-white p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#013C3C]">{title}</h1>
          <p className="text-sm font-medium text-[#013C3C]/50">{subtitle}</p>
        </div>
        <PlatformFilter activeFilter={filter} onFilterChange={setFilter} />
      </div>

      <div className="flex flex-col gap-6">
        {filteredSummaries.length > 0 ? (
          filteredSummaries.map((summary) => (
            <SummaryCard key={summary.id} data={summary} />
          ))
        ) : (
          <div className="rounded-3xl border border-[#013C3C]/10 bg-white py-12 text-center text-sm font-medium text-[#013C3C]/40">
            Nenhum resumo encontrado para esta plataforma.
          </div>
        )}
      </div>
    </div>
  );
}
