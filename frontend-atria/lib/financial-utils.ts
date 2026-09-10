export const FINANCE_COLORS = {
  income: {
    primary: "#10B981",
    dark: "#059669",
    bg: "rgba(16, 185, 129, 0.12)",
    glow: "rgba(16, 185, 129, 0.35)",
    border: "rgba(16, 185, 129, 0.45)",
  },
  expense: {
    primary: "#EF4444",
    dark: "#DC2626",
    bg: "rgba(239, 68, 68, 0.12)",
    glow: "rgba(239, 68, 68, 0.35)",
    border: "rgba(239, 68, 68, 0.45)",
  },
  balance: {
    primary: "#8B5CF6",
    dark: "#7C3AED",
    bg: "rgba(139, 92, 246, 0.12)",
    glow: "rgba(139, 92, 246, 0.35)",
    border: "rgba(139, 92, 246, 0.45)",
  },
  pending: {
    primary: "#F59E0B",
    dark: "#D97706",
    bg: "rgba(245, 158, 11, 0.14)",
    glow: "rgba(245, 158, 11, 0.35)",
    border: "rgba(245, 158, 11, 0.45)",
  },
} as const;

export const CHART_COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#3B82F6",
  "#F97316",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#6366F1",
  "#14B8A6",
  "#EF4444",
] as const;

export const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const MONTH_NAMES_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export interface FinancePeriod {
  month: number;
  year: number;
}

export function getCurrentPeriod(): FinancePeriod {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function formatPeriodLabel(period: FinancePeriod) {
  const name = MONTH_NAMES_LONG[period.month - 1] ?? "";
  return `${name} ${period.year}`;
}

export function formatMonthKey(period: FinancePeriod) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthBounds(period: FinancePeriod) {
  const start = new Date(period.year, period.month - 1, 1);
  const end = new Date(period.year, period.month, 0);
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

/** Build a midday local ISO string from YYYY-MM-DD to avoid timezone day shifts. */
export function toLocalDateIso(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date.toISOString();
}

export function shiftPeriod(
  period: FinancePeriod,
  deltaMonths: number,
): FinancePeriod {
  const date = new Date(period.year, period.month - 1 + deltaMonths, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function buildMonthPills(
  center: FinancePeriod,
  radius = 2,
): (FinancePeriod & { isCurrent: boolean; isCenter: boolean })[] {
  const now = getCurrentPeriod();
  const pills: (FinancePeriod & { isCurrent: boolean; isCenter: boolean })[] =
    [];

  for (let offset = -radius; offset <= radius; offset++) {
    const period = shiftPeriod(center, offset);
    pills.push({
      ...period,
      isCenter: offset === 0,
      isCurrent:
        period.month === now.month && period.year === now.year,
    });
  }

  return pills;
}

export function formatChartMonth(month: string) {
  const [, m] = month.split("-");
  return MONTH_NAMES_SHORT[Number(m) - 1] ?? month;
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatCompactCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDate(date: string) {
  const datePart = date.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const STATUS_LABELS = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Pendente",
} as const;

export const STATUS_STYLES = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
  overdue:
    "border-amber-200 bg-amber-50 text-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
} as const;

export const TYPE_LABELS = {
  income: "Receita",
  expense: "Despesa",
} as const;

export const CATEGORY_TYPE_LABELS = {
  income: "Receita",
  expense: "Despesa",
} as const;

export const PRESET_COLORS = [
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#3B82F6",
  "#F59E0B",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
  "#F97316",
];

const CATEGORY_COLOR_HINTS: Record<string, string> = {
  marketing: "#8B5CF6",
  ferramentas: "#06B6D4",
  software: "#06B6D4",
  infra: "#06B6D4",
  equipe: "#3B82F6",
  salários: "#3B82F6",
  salarios: "#3B82F6",
  impostos: "#F97316",
  escritório: "#14B8A6",
  escritorio: "#14B8A6",
  projetos: "#10B981",
  contratos: "#059669",
  retainer: "#6366F1",
  consultoria: "#EC4899",
};

export function resolveCategoryColor(name: string, fallback?: string) {
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return CATEGORY_COLOR_HINTS[key] ?? fallback ?? "#8B5CF6";
}

export function getContrastColor(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1E293B" : "#FFFFFF";
}

export type FinanceSheetFocus = "due" | "month-end";

export interface FinanceDueLike {
  title?: string;
  description: string;
  date: string;
  dueDate: string | null;
  status: string;
}

export function getDateKey(value: string) {
  return value.slice(0, 10);
}

export function getTransactionLabel(item: {
  title?: string;
  description: string;
}) {
  return (item.title || item.description).trim();
}

export function getDueDateKey(item: FinanceDueLike) {
  return getDateKey(item.dueDate ?? item.date);
}

export function isUnpaidTransaction(item: { status: string }) {
  return item.status !== "paid";
}

export function sortAlphabetically<
  T extends { title?: string; description: string },
>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    getTransactionLabel(left).localeCompare(
      getTransactionLabel(right),
      "pt-BR",
      { sensitivity: "base" },
    ),
  );
}

export function getDueSheetBuckets<T extends FinanceDueLike>(
  transactions: T[],
  period: FinancePeriod,
  today = formatLocalDate(new Date()),
) {
  const { startDate, endDate } = getMonthBounds(period);
  const current = getCurrentPeriod();
  const isCurrentPeriod =
    period.month === current.month && period.year === current.year;

  const dueNow: T[] = [];
  const monthEnd: T[] = [];

  for (const transaction of transactions) {
    if (!isUnpaidTransaction(transaction)) continue;

    const dueKey = getDueDateKey(transaction);
    const inSelectedMonth = dueKey >= startDate && dueKey <= endDate;

    if (dueKey <= today) {
      if (inSelectedMonth || (isCurrentPeriod && dueKey < startDate)) {
        dueNow.push(transaction);
      }
      continue;
    }

    if (inSelectedMonth) {
      monthEnd.push(transaction);
    }
  }

  return {
    dueNow: sortAlphabetically(dueNow),
    monthEnd: sortAlphabetically(monthEnd),
  };
}
