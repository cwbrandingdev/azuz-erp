const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const SAO_PAULO_OFFSET_HOURS = 3;

export interface InstagramInsightsPeriod {
  month: number;
  year: number;
  since: number;
  until: number;
  label: string;
}

export interface InstagramInsightsGraphWindow {
  since: number;
  until: number;
  available: boolean;
  partial: boolean;
}

export const ACCOUNT_LOOKBACK_SECONDS = 30 * 24 * 60 * 60;

export function currentBrazilPeriod(now = new Date()): {
  month: number;
  year: number;
} {
  const shifted = new Date(
    now.getTime() - SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000,
  );
  return {
    month: shifted.getUTCMonth() + 1,
    year: shifted.getUTCFullYear(),
  };
}

export function resolveInsightsPeriod(
  month?: number,
  year?: number,
  now = new Date(),
): InstagramInsightsPeriod {
  const current = currentBrazilPeriod(now);
  let resolvedMonth = Number.isInteger(month) ? Number(month) : current.month;
  let resolvedYear = Number.isInteger(year) ? Number(year) : current.year;

  if (resolvedMonth < 1 || resolvedMonth > 12) {
    resolvedMonth = current.month;
    resolvedYear = current.year;
  }

  if (
    resolvedYear > current.year ||
    (resolvedYear === current.year && resolvedMonth > current.month)
  ) {
    resolvedMonth = current.month;
    resolvedYear = current.year;
  }

  const since =
    Date.UTC(resolvedYear, resolvedMonth - 1, 1, SAO_PAULO_OFFSET_HOURS, 0, 0) /
    1000;
  const nextMonthStart =
    Date.UTC(resolvedYear, resolvedMonth, 1, SAO_PAULO_OFFSET_HOURS, 0, 0) /
    1000;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const until = Math.max(since + 1, Math.min(nextMonthStart, nowSeconds));

  return {
    month: resolvedMonth,
    year: resolvedYear,
    since,
    until,
    label: `${MONTH_LABELS[resolvedMonth - 1]} ${resolvedYear}`,
  };
}

export function isTimestampInPeriod(
  timestamp: string | null | undefined,
  since: number,
  until: number,
): boolean {
  if (!timestamp) {
    return false;
  }
  const value = Date.parse(timestamp);
  if (Number.isNaN(value)) {
    return false;
  }
  const seconds = Math.floor(value / 1000);
  return seconds >= since && seconds < until;
}

export function intersectWithLookback(
  period: InstagramInsightsPeriod,
  now = new Date(),
): InstagramInsightsGraphWindow {
  const lookbackSince =
    Math.floor(now.getTime() / 1000) - ACCOUNT_LOOKBACK_SECONDS;
  const since = Math.max(period.since, lookbackSince);
  const until = period.until;
  return {
    since,
    until,
    available: since < until,
    partial: since < until && since > period.since,
  };
}
