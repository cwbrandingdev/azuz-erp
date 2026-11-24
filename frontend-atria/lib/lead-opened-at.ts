import type { Lead } from "@/services/types";

/** Reads Receita opening date from lead.rawData (ISO or YYYY-MM-DD). */
export function getLeadOpenedAt(lead: Lead): Date | null {
  const raw = lead.rawData;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const value = record.openedAt ?? record.data_inicio_atividade;
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatLeadOpenedAt(lead: Lead): string | null {
  const date = getLeadOpenedAt(lead);
  if (!date) return null;
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Inclusive range filter. If only `from` is set, upper bound is end of today. */
export function leadMatchesOpenedAtRange(
  lead: Lead,
  from: string,
  to: string,
): boolean {
  const fromTrim = from.trim();
  const toTrim = to.trim();
  if (!fromTrim && !toTrim) {
    return true;
  }

  const openedAt = getLeadOpenedAt(lead);
  if (!openedAt) {
    return false;
  }

  const openedDay = openedAt.toISOString().slice(0, 10);

  if (fromTrim && openedDay < fromTrim) {
    return false;
  }

  const upper = toTrim || new Date().toISOString().slice(0, 10);
  if (openedDay > upper) {
    return false;
  }

  return true;
}
