"use client";

import { useState } from "react";
import { CalendarDays, List, type LucideIcon } from "lucide-react";
import { TeamTimeClock } from "@/components/time-clock/team-time-clock";
import { TeamTimeClockCalendar } from "@/components/time-clock/team-time-clock-calendar";
import { cn } from "@/lib/utils";

type TeamView = "list" | "calendar";

const VIEW_OPTIONS: { value: TeamView; label: string; icon: LucideIcon }[] = [
  { value: "list", label: "Lista", icon: List },
  { value: "calendar", label: "Calendário", icon: CalendarDays },
];

export function TeamTimeClockSection() {
  const [view, setView] = useState<TeamView>("list");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
          Equipe
        </h2>
        <div
          role="tablist"
          aria-label="Visualização da equipe"
          className="inline-flex rounded-lg border border-[var(--atria-primary)]/15 bg-white p-0.5"
        >
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
                view === value
                  ? "bg-[var(--atria-primary)] text-white"
                  : "text-[var(--atria-primary)]/70 hover:bg-[var(--atria-accent)]/20",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? <TeamTimeClock /> : <TeamTimeClockCalendar />}
    </section>
  );
}
