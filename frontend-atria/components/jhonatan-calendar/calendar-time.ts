export const SAO_PAULO_TZ = "America/Sao_Paulo";
export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 19;
export const HOUR_PX = 52;

export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, index) => GRID_START_HOUR + index,
);

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function localYmd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function saoPauloToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(read("year"), read("month") - 1, read("day"));
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function monthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const start = addDays(first, -startOffset);
  const days: Date[] = [];

  for (let cursor = start; days.length < 42; cursor = addDays(cursor, 1)) {
    days.push(cursor);
    if (cursor >= last && days.length % 7 === 0) break;
  }

  return days;
}

export function weekQueryRange(days: Date[]) {
  const start = localYmd(days[0]);
  const end = localYmd(days[days.length - 1]);
  return {
    from: `${start}T00:00:00-03:00`,
    to: `${end}T23:59:59.999-03:00`,
  };
}

export function toSaoPauloIso(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!match) return value;
  return `${match[1]}T${match[2]}:00-03:00`;
}

export function slotDateTimeLocal(day: Date, hour: number) {
  return `${localYmd(day)}T${pad(hour)}:00`;
}

export function formatSaoPauloTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SAO_PAULO_TZ,
  });
}

export function formatSaoPauloDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SAO_PAULO_TZ,
  });
}

export function gridPlacement(
  startAt: string,
  endAt: string,
  day: Date,
): { top: number; height: number } | "outside" | null {
  const ymd = localYmd(day);
  const dayStart = new Date(`${ymd}T00:00:00-03:00`).getTime();
  const dayEnd = new Date(`${ymd}T23:59:59.999-03:00`).getTime();
  const gridStart = new Date(
    `${ymd}T${pad(GRID_START_HOUR)}:00:00-03:00`,
  ).getTime();
  const gridEnd = new Date(`${ymd}T${pad(GRID_END_HOUR)}:00:00-03:00`).getTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end <= dayStart ||
    start >= dayEnd
  ) {
    return null;
  }

  const visibleStart = Math.max(start, gridStart);
  const visibleEnd = Math.min(end, gridEnd);
  if (visibleEnd <= visibleStart) return "outside";

  const top = ((visibleStart - gridStart) / 3_600_000) * HOUR_PX;
  const height = Math.max(
    ((visibleEnd - visibleStart) / 3_600_000) * HOUR_PX - 4,
    24,
  );
  return { top: top + 2, height };
}
