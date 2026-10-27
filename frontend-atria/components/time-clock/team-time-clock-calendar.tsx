"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeClockDayDialog } from "@/components/time-clock/time-clock-day-dialog";
import { TimeClockEntryDialog } from "@/components/time-clock/time-clock-entry-dialog";
import { useTeamTimeClock } from "@/hooks/use-time-clock";
import {
  CALENDAR_MONTH_LABELS,
  CALENDAR_WEEKDAY_SHORT,
} from "@/lib/calendar-utils";
import {
  buildMonthGrid,
  firstName,
  groupMemberDaysByDate,
  monthFromDayKey,
  monthRange,
  shiftMonth,
  type CalendarMonth,
  type MemberDay,
} from "@/lib/time-clock-calendar";
import {
  formatPunchTime,
  formatWorkedMinutes,
  todayDayKey,
} from "@/lib/time-clock-format";
import { cn } from "@/lib/utils";
import type { TimeClockEntry } from "@/services/types";

const MAX_NAMES_PER_CELL = 3;
const SELECT_CLASS_NAME =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function TeamTimeClockCalendar() {
  const todayKey = todayDayKey();
  const [month, setMonth] = useState<CalendarMonth>(() =>
    monthFromDayKey(todayKey),
  );
  const [userId, setUserId] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeClockEntry | null>(null);

  // Filtering happens client-side so the collaborator list stays complete.
  const { data, isLoading } = useTeamTimeClock(monthRange(month));
  const members = useMemo(() => data?.users ?? [], [data]);

  const memberDaysByDate = useMemo(
    () =>
      groupMemberDaysByDate(
        userId ? members.filter((member) => member.user.id === userId) : members,
      ),
    [members, userId],
  );
  const memberOptions = members.map((member) => member.user);
  const cells = buildMonthGrid(month);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center font-semibold text-[var(--atria-primary)]">
            {CALENDAR_MONTH_LABELS[month.month - 1]} {month.year}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <select
          aria-label="Filtrar por colaborador"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className={SELECT_CLASS_NAME}
        >
          <option value="">Todos os colaboradores</option>
          {memberOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {CALENDAR_WEEKDAY_SHORT.map((weekday) => (
          <div
            key={weekday}
            className="py-1 text-center text-xs font-semibold uppercase text-[var(--atria-primary)]/50"
          >
            {weekday}
          </div>
        ))}

        {cells.map((dayKey, index) =>
          dayKey ? (
            <CalendarDayCell
              key={dayKey}
              dayKey={dayKey}
              memberDays={memberDaysByDate.get(dayKey) ?? []}
              isToday={dayKey === todayKey}
              isFuture={dayKey > todayKey}
              isLoading={isLoading}
              showTimes={Boolean(userId)}
              onSelect={() => setSelectedDay(dayKey)}
            />
          ) : (
            <div key={`pad-${index}`} />
          ),
        )}
      </div>

      <TimeClockDayDialog
        dayKey={selectedDay}
        memberDays={selectedDay ? (memberDaysByDate.get(selectedDay) ?? []) : []}
        todayKey={todayKey}
        onClose={() => setSelectedDay(null)}
        onEditEntry={(entry) => {
          setSelectedDay(null);
          setEditingEntry(entry);
        }}
      />

      <TimeClockEntryDialog
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
        members={memberOptions}
        entry={editingEntry}
      />
    </section>
  );
}

interface CalendarDayCellProps {
  dayKey: string;
  memberDays: MemberDay[];
  isToday: boolean;
  isFuture: boolean;
  isLoading: boolean;
  /** With a single person filtered, show their punch times instead of names. */
  showTimes: boolean;
  onSelect: () => void;
}

function CalendarDayCell({
  dayKey,
  memberDays,
  isToday,
  isFuture,
  isLoading,
  showTimes,
  onSelect,
}: CalendarDayCellProps) {
  const hasMissingOut = memberDays.some(
    ({ day }) => day.isOpen && !isToday,
  );
  const hiddenCount = Math.max(0, memberDays.length - MAX_NAMES_PER_CELL);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isFuture || isLoading}
      className={cn(
        "flex min-h-16 flex-col gap-1 rounded-xl border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2",
        "border-[var(--atria-primary)]/10 hover:border-[var(--atria-primary)]/30 disabled:hover:border-[var(--atria-primary)]/10",
        isFuture && "opacity-40",
        hasMissingOut && "border-red-300",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-lg text-xs font-bold sm:text-sm",
            isToday
              ? "bg-[var(--atria-primary)] text-white"
              : "text-[var(--atria-primary)]",
          )}
        >
          {Number(dayKey.slice(8))}
        </span>
        {memberDays.length > 0 ? (
          <span className="rounded-full bg-[var(--atria-accent)]/30 px-1.5 text-[10px] font-semibold text-[var(--atria-primary)] sm:hidden">
            {memberDays.length}
          </span>
        ) : null}
      </div>

      <div className="hidden flex-col gap-0.5 sm:flex">
        {showTimes
          ? memberDays.map(({ user, day }) => (
              <PunchTimesSummary key={user.id} entries={day.entries} />
            ))
          : memberDays.slice(0, MAX_NAMES_PER_CELL).map(({ user, day }) => (
              <span
                key={user.id}
                className={cn(
                  "truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                  day.isOpen && !isToday
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700",
                )}
                title={`${user.name}: ${formatWorkedMinutes(day.workedMinutes)}`}
              >
                {firstName(user.name)} · {formatWorkedMinutes(day.workedMinutes)}
              </span>
            ))}
        {!showTimes && hiddenCount > 0 ? (
          <span className="text-[11px] font-medium text-[var(--atria-primary)]/60">
            +{hiddenCount} {hiddenCount === 1 ? "pessoa" : "pessoas"}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function PunchTimesSummary({ entries }: { entries: TimeClockEntry[] }) {
  const first = entries.at(0);
  const last = entries.at(-1);
  if (!first || !last) return null;

  const end = last.type === "OUT" ? formatPunchTime(last.punchedAt) : "…";
  return (
    <span className="truncate text-[11px] font-medium text-[var(--atria-primary)]/80">
      {formatPunchTime(first.punchedAt)} – {end}
    </span>
  );
}
