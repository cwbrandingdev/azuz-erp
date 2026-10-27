import type { TimeClockEntryType } from "@/services/types";

// Matches the backend, which groups punches by São Paulo calendar day.
const TIME_ZONE = "America/Sao_Paulo";

export const TIME_CLOCK_TYPE_LABELS: Record<TimeClockEntryType, string> = {
  IN: "Entrada",
  BREAK_START: "Saída para almoço",
  BREAK_END: "Volta do almoço",
  OUT: "Saída",
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const rangeDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's São Paulo calendar day as YYYY-MM-DD. */
export function todayDayKey(): string {
  return dayKeyFormatter.format(new Date());
}

export function formatPunchTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Formats a YYYY-MM-DD day key, e.g. "seg., 26 de out.". */
export function formatDayKey(dayKey: string): string {
  // Noon avoids the date shifting a day when rendered in São Paulo.
  return dayFormatter.format(new Date(`${dayKey}T12:00:00-03:00`));
}

export function formatRangeDay(dayKey: string): string {
  return rangeDayFormatter.format(new Date(`${dayKey}T12:00:00-03:00`));
}

/** Formats minutes as "7h 05min". */
export function formatWorkedMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}
