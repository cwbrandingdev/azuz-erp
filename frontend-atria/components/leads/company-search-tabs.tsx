"use client";

import { cn } from "@/lib/utils";
import type { LeadSearchQueryType } from "@/services/company-search.service";

const TABS: Array<{ id: LeadSearchQueryType; label: string }> = [
  { id: "NICHO", label: "Por tipo de negócio" },
  { id: "CNAE", label: "Por código CNAE" },
];

interface CompanySearchTabsProps {
  activeTab: LeadSearchQueryType;
  onChange: (tab: LeadSearchQueryType) => void;
}

export function CompanySearchTabs({
  activeTab,
  onChange,
}: CompanySearchTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/60 p-1.5 backdrop-blur-md">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            activeTab === tab.id
              ? "bg-[var(--atria-primary)] text-white shadow-sm"
              : "text-[var(--atria-primary)]/70 hover:bg-white/80 hover:text-[var(--atria-primary)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
