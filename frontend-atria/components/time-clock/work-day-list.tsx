"use client";

import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatDayKey,
  formatPunchTime,
  formatWorkedMinutes,
  TIME_CLOCK_TYPE_LABELS,
} from "@/lib/time-clock-format";
import { cn } from "@/lib/utils";
import type {
  TimeClockDay,
  TimeClockEntry,
  TimeClockEntryType,
} from "@/services/types";

interface WorkDayListProps {
  days: TimeClockDay[];
  todayKey: string;
  emptyMessage: string;
  onEditEntry?: (entry: TimeClockEntry) => void;
}

const ENTRY_CHIP_COLORS: Record<TimeClockEntryType, string> = {
  IN: "bg-green-50 text-green-700",
  BREAK_START: "bg-amber-50 text-amber-700",
  BREAK_END: "bg-amber-50 text-amber-700",
  OUT: "bg-[var(--atria-accent)]/30 text-[var(--atria-primary)]",
};

function describeEntryAudit(entry: TimeClockEntry): string | undefined {
  const actor = entry.updatedBy ?? entry.createdBy;
  if (!actor) return undefined;
  const action = entry.updatedBy ? "Corrigido" : "Adicionado";
  const note = entry.note ? `: ${entry.note}` : "";
  return `${action} por ${actor.name}${note}`;
}

function DayStatusBadge({ day, todayKey }: { day: TimeClockDay; todayKey: string }) {
  if (!day.isOpen) return null;
  if (day.date === todayKey) {
    return <Badge variant="success">Em andamento</Badge>;
  }
  return <Badge variant="destructive">Sem saída</Badge>;
}

export function WorkDayList({
  days,
  todayKey,
  emptyMessage,
  onEditEntry,
}: WorkDayListProps) {
  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white/60 px-6 py-8 text-center text-sm text-[var(--atria-primary)]/50">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {days.map((day) => (
        <li
          key={day.date}
          className="flex flex-col gap-3 rounded-xl border border-[var(--atria-primary)]/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize text-[var(--atria-primary)]">
                {formatDayKey(day.date)}
              </span>
              <DayStatusBadge day={day} todayKey={todayKey} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {day.entries.map((entry) => (
                <EntryChip
                  key={entry.id}
                  entry={entry}
                  onEdit={onEditEntry}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-sm font-semibold text-[var(--atria-primary)]">
              {formatWorkedMinutes(day.workedMinutes)}
            </span>
            {day.breakMinutes > 0 ? (
              <span className="text-xs text-[var(--atria-primary)]/50">
                Almoço: {formatWorkedMinutes(day.breakMinutes)}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EntryChip({
  entry,
  onEdit,
}: {
  entry: TimeClockEntry;
  onEdit?: (entry: TimeClockEntry) => void;
}) {
  const label = `${TIME_CLOCK_TYPE_LABELS[entry.type]} ${formatPunchTime(entry.punchedAt)}`;
  const audit = describeEntryAudit(entry);
  const className = cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
    ENTRY_CHIP_COLORS[entry.type],
    audit && "ring-1 ring-amber-300",
  );

  if (!onEdit) {
    return (
      <span className={className} title={audit}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn(className, "hover:opacity-80")}
      title={audit ?? "Corrigir marcação"}
      onClick={() => onEdit(entry)}
    >
      {label}
      <Pencil className="size-3" />
    </button>
  );
}
