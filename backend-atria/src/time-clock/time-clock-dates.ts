export const SAO_PAULO_TZ = 'America/Sao_Paulo';

// Brazil dropped daylight saving time in 2019, so the offset is fixed.
const SAO_PAULO_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Returns the São Paulo calendar day of a date as YYYY-MM-DD. */
export function toSaoPauloDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

export function startOfSaoPauloDay(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000${SAO_PAULO_OFFSET}`);
}

export function endOfSaoPauloDayExclusive(dayKey: string): Date {
  return new Date(startOfSaoPauloDay(dayKey).getTime() + DAY_MS);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const diff =
    startOfSaoPauloDay(toKey).getTime() - startOfSaoPauloDay(fromKey).getTime();
  return Math.round(diff / DAY_MS);
}

export function currentMonthRange(now = new Date()): {
  from: string;
  to: string;
} {
  const today = toSaoPauloDayKey(now);
  return { from: `${today.slice(0, 7)}-01`, to: today };
}
