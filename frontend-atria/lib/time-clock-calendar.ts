import type {
  TeamTimeClockMember,
  TimeClockDay,
} from "@/services/types";

export interface CalendarMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export interface MemberDay {
  user: TeamTimeClockMember["user"];
  day: TimeClockDay;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth({ year, month }: CalendarMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthFromDayKey(dayKey: string): CalendarMonth {
  const [year, month] = dayKey.split("-").map(Number);
  return { year, month };
}

export function shiftMonth(current: CalendarMonth, delta: number): CalendarMonth {
  const date = new Date(Date.UTC(current.year, current.month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthRange(current: CalendarMonth): { from: string; to: string } {
  const prefix = `${current.year}-${pad(current.month)}`;
  return {
    from: `${prefix}-01`,
    to: `${prefix}-${pad(daysInMonth(current))}`,
  };
}

/** Day keys for a Sunday-first month grid; null pads the first week. */
export function buildMonthGrid(current: CalendarMonth): (string | null)[] {
  const firstWeekday = new Date(
    Date.UTC(current.year, current.month - 1, 1),
  ).getUTCDay();
  const prefix = `${current.year}-${pad(current.month)}`;
  const cells: (string | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );

  for (let day = 1; day <= daysInMonth(current); day++) {
    cells.push(`${prefix}-${pad(day)}`);
  }
  return cells;
}

export function groupMemberDaysByDate(
  members: TeamTimeClockMember[],
): Map<string, MemberDay[]> {
  const byDate = new Map<string, MemberDay[]>();
  for (const member of members) {
    for (const day of member.days) {
      const memberDays = byDate.get(day.date) ?? [];
      memberDays.push({ user: member.user, day });
      byDate.set(day.date, memberDays);
    }
  }
  return byDate;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
