"use client";

import { cn } from "@/lib/utils";

export type UsersDirectoryTab = "members" | "groups";

const TABS: Array<{ id: UsersDirectoryTab; label: string }> = [
  { id: "members", label: "Membros" },
  { id: "groups", label: "Grupos" },
];

interface UsersDirectoryTabsProps {
  activeTab: UsersDirectoryTab;
  counts: Record<UsersDirectoryTab, number | null>;
  onChange: (tab: UsersDirectoryTab) => void;
}

export function UsersDirectoryTabs({
  activeTab,
  counts,
  onChange,
}: UsersDirectoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/60 p-1.5 backdrop-blur-md">
      {TABS.map((tab) => {
        const count = counts[tab.id];
        return (
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
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                activeTab === tab.id
                  ? "text-white/75"
                  : "text-[var(--atria-primary)]/40",
              )}
            >
              ({count === null ? "…" : count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
