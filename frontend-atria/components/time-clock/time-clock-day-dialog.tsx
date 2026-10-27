"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntryChip } from "@/components/time-clock/work-day-list";
import type { MemberDay } from "@/lib/time-clock-calendar";
import {
  formatDayKey,
  formatWorkedMinutes,
} from "@/lib/time-clock-format";
import type { TimeClockEntry } from "@/services/types";

interface TimeClockDayDialogProps {
  dayKey: string | null;
  memberDays: MemberDay[];
  todayKey: string;
  onClose: () => void;
  onEditEntry: (entry: TimeClockEntry) => void;
}

export function TimeClockDayDialog({
  dayKey,
  memberDays,
  todayKey,
  onClose,
  onEditEntry,
}: TimeClockDayDialogProps) {
  return (
    <Dialog
      open={dayKey !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize text-[var(--atria-primary)]">
            {dayKey ? formatDayKey(dayKey) : null}
          </DialogTitle>
          <DialogDescription>
            {memberDays.length === 0
              ? "Ninguém bateu o ponto neste dia."
              : `${memberDays.length} ${memberDays.length === 1 ? "pessoa bateu" : "pessoas bateram"} o ponto. Clique numa marcação para corrigir.`}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {memberDays.map(({ user, day }) => (
            <li
              key={user.id}
              className="flex flex-col gap-2 rounded-xl border border-[var(--atria-primary)]/10 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[var(--atria-primary)]">
                  {user.name}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {day.isOpen && day.date !== todayKey ? (
                    <Badge variant="destructive">Sem saída</Badge>
                  ) : null}
                  <span className="text-sm font-semibold text-[var(--atria-primary)]">
                    {formatWorkedMinutes(day.workedMinutes)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {day.entries.map((entry) => (
                  <EntryChip key={entry.id} entry={entry} onEdit={onEditEntry} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
