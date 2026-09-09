"use client";

import { ReportGenerator } from "@/components/reports/report-generator";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Relatórios
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Gere relatórios executivos de performance e compartilhe o portal do
          cliente
        </p>
      </div>
      <ReportGenerator />
    </div>
  );
}
