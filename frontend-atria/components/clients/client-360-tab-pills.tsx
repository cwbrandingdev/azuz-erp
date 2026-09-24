"use client";

import { cn } from "@/lib/utils";

export type Client360Tab =
  | "pipeline"
  | "financial"
  | "calendar"
  | "requests"
  | "access";

const TABS: Array<{ id: Client360Tab; label: string }> = [
  { id: "pipeline", label: "Pipeline de Conteúdo" },
  { id: "financial", label: "Financeiro & Contratos" },
  { id: "calendar", label: "Calendário & Agenda" },
  { id: "requests", label: "Solicitações / Ideias" },
  { id: "access", label: "Acessos" },
];

interface Client360TabPillsProps {
  activeTab: Client360Tab;
  onChange: (tab: Client360Tab) => void;
}

export function Client360TabPills({
  activeTab,
  onChange,
}: Client360TabPillsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/60 p-1.5 backdrop-blur-md">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-all",
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
