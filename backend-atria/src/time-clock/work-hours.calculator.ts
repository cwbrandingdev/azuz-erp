import { Injectable } from '@nestjs/common';
import { TimeClockEntryType } from '@prisma/client';
import { toSaoPauloDayKey } from './time-clock-dates';

const { IN, BREAK_START, BREAK_END, OUT } = TimeClockEntryType;

const WORK_STARTS: ReadonlySet<TimeClockEntryType> = new Set([IN, BREAK_END]);
const WORK_ENDS: ReadonlySet<TimeClockEntryType> = new Set([BREAK_START, OUT]);

export interface TimeClockPunch {
  type: TimeClockEntryType;
  punchedAt: Date;
}

export interface WorkDaySummary<T extends TimeClockPunch> {
  date: string;
  workedMinutes: number;
  breakMinutes: number;
  isOpen: boolean;
  entries: T[];
}

@Injectable()
export class WorkHoursCalculator {
  /** Punch types the user may register next, given today's punches. */
  allowedTypes(dayEntries: TimeClockPunch[]): TimeClockEntryType[] {
    const lastType = dayEntries.at(-1)?.type;

    if (lastType === BREAK_START) return [BREAK_END];
    if (lastType === BREAK_END) return [OUT];
    if (lastType !== IN) return [IN];

    // Only one lunch break per day.
    const hadBreak = dayEntries.some((entry) => entry.type === BREAK_START);
    return hadBreak ? [OUT] : [BREAK_START, OUT];
  }

  /** Groups punches by São Paulo day, most recent day first. */
  summarizeByDay<T extends TimeClockPunch>(
    entries: T[],
    now = new Date(),
  ): WorkDaySummary<T>[] {
    const byDay = new Map<string, T[]>();
    const sorted = [...entries].sort(
      (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime(),
    );

    for (const entry of sorted) {
      const dayKey = toSaoPauloDayKey(entry.punchedAt);
      const dayEntries = byDay.get(dayKey) ?? [];
      dayEntries.push(entry);
      byDay.set(dayKey, dayEntries);
    }

    return [...byDay.entries()]
      .map(([date, dayEntries]) => this.summarizeDay(date, dayEntries, now))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  totalMinutes(days: WorkDaySummary<TimeClockPunch>[]): number {
    return days.reduce((sum, day) => sum + day.workedMinutes, 0);
  }

  private summarizeDay<T extends TimeClockPunch>(
    date: string,
    entries: T[],
    now: Date,
  ): WorkDaySummary<T> {
    let workedMs = 0;
    let breakMs = 0;
    let workingSince: Date | null = null;
    let breakSince: Date | null = null;

    for (const entry of entries) {
      if (entry.type === BREAK_END && breakSince) {
        breakMs += entry.punchedAt.getTime() - breakSince.getTime();
        breakSince = null;
      }
      if (WORK_STARTS.has(entry.type)) {
        workingSince ??= entry.punchedAt;
        continue;
      }
      if (WORK_ENDS.has(entry.type) && workingSince) {
        workedMs += entry.punchedAt.getTime() - workingSince.getTime();
        workingSince = null;
      }
      if (entry.type === BREAK_START) {
        breakSince = entry.punchedAt;
      }
    }

    // Open periods only count until now on the current day; a past day
    // without a closing punch is flagged instead of guessing its end.
    const isOpen = workingSince !== null || breakSince !== null;
    if (date === toSaoPauloDayKey(now)) {
      workedMs += this.elapsedSince(workingSince, now);
      breakMs += this.elapsedSince(breakSince, now);
    }

    return {
      date,
      workedMinutes: Math.floor(workedMs / 60_000),
      breakMinutes: Math.floor(breakMs / 60_000),
      isOpen,
      entries,
    };
  }

  private elapsedSince(start: Date | null, now: Date): number {
    if (!start) return 0;
    return Math.max(0, now.getTime() - start.getTime());
  }
}
