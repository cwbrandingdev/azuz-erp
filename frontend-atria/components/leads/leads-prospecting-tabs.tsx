"use client";

import { cn } from "@/lib/utils";

export type LeadsProspectingMode = "b2b" | "maps";

const TABS: Array<{ id: LeadsProspectingMode; label: string }> = [
  { id: "b2b", label: "Empresas (CNAE/Nicho)" },
  { id: "maps", label: "Google Maps" },
];

interface LeadsProspectingTabsProps {
  activeMode: LeadsProspectingMode;
  onChange: (mode: LeadsProspectingMode) => void;
}

export function LeadsProspectingTabs({
  activeMode,
  onChange,
}: LeadsProspectingTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/60 p-1.5 backdrop-blur-md">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            activeMode === tab.id
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
