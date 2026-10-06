import type { LeadKanbanColumn, LeadStatus } from "@/services/types";

export const ORCAMENTO_STAGE_KEY = "ORCAMENTO";

export const LEAD_KANBAN_STATUSES: readonly LeadStatus[] = [
  "PRE_VENDA",
  "APRESENTACAO",
  "REUNIAO_AGENDADA",
  "AGUARDANDO_ENTREGA",
  "VENDA_FINALIZADA",
  "AGUARDANDO_RESPOSTA",
  "NAO_TEM_INTERESSE",
] as const;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  PRE_VENDA: "Pré venda",
  APRESENTACAO: "Apresentação",
  REUNIAO_AGENDADA: "Reunião agendada",
  VENDA_FINALIZADA: "Venda finalizada",
  AGUARDANDO_ENTREGA: "Aguardando documentos",
  POS_VENDA: "Pós venda",
  NAO_TEM_INTERESSE: "Não tem interesse",
  AGUARDANDO_RESPOSTA: "Aguardando resposta",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  PRE_VENDA: "#F97316",
  APRESENTACAO: "#3B82F6",
  REUNIAO_AGENDADA: "#8B5CF6",
  VENDA_FINALIZADA: "#22C55E",
  AGUARDANDO_ENTREGA: "#EAB308",
  POS_VENDA: "#14B8A6",
  NAO_TEM_INTERESSE: "#EF4444",
  AGUARDANDO_RESPOSTA: "#64748B",
};

export function getLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

export function getLeadStatusColor(status: string): string {
  return LEAD_STATUS_COLORS[status as LeadStatus] ?? "#64748B";
}

export function leadColumnKey(
  column: Pick<LeadKanbanColumn, "id" | "stageId" | "status">,
): string {
  return column.stageId ?? column.id ?? column.status;
}

export function isOrcamentoColumn(
  column: Pick<LeadKanbanColumn, "status" | "title">,
): boolean {
  if (column.status === ORCAMENTO_STAGE_KEY) return true;
  const title = column.title?.trim().toLowerCase();
  return title === "orçamento" || title === "orcamento";
}

export function shouldLeadAutoMinimize(status: string): boolean {
  return status === "VENDA_FINALIZADA" || status === "NAO_TEM_INTERESSE";
}

export function isLeadCollapsed(lead: {
  status: LeadStatus;
  isMinimized?: boolean;
}): boolean {
  if (lead.isMinimized !== undefined) {
    return lead.isMinimized;
  }
  return shouldLeadAutoMinimize(lead.status);
}

function normalizeLeadCategory(value: string) {
  return value.trim().toLowerCase();
}

export function leadMatchesCategory(lead: { category?: string | null }, category: string) {
  return normalizeLeadCategory(lead.category ?? "") === normalizeLeadCategory(category);
}

export function leadMatchesSearchQuery(
  lead: {
    name?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    category?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    website?: string | null;
  },
  query: string,
) {
  if (!query) return true;

  const haystack = [
    lead.name,
    lead.city,
    lead.neighborhood,
    lead.category,
    lead.phone,
    lead.email,
    lead.address,
    lead.website,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function collectLeadCategories(
  leads: Array<{ category?: string | null }>,
) {
  const categories = new Set<string>();
  for (const lead of leads) {
    const category = lead.category?.trim();
    if (category) categories.add(category);
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function toLocalDateKey(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKeyInRange(
  dateKey: string | null,
  startDate: string,
  endDate: string,
): boolean {
  if (!dateKey) return false;
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
  return true;
}

export function leadMatchesDateFilter(
  lead: { createdAt?: string },
  filters: { startDate: string; endDate: string },
): boolean {
  if (!filters.startDate && !filters.endDate) return true;

  return isDateKeyInRange(
    toLocalDateKey(lead.createdAt),
    filters.startDate,
    filters.endDate,
  );
}

export function formatLeadOrcamento(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseLeadOrcamento(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withoutSymbol = trimmed.replace(/R\$\s?/gi, "");
  const hasComma = withoutSymbol.includes(",");
  const normalized = hasComma
    ? withoutSymbol.replace(/\./g, "").replace(",", ".")
    : withoutSymbol.replace(/,/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function sumLeadOrcamentos(
  leads: Array<{ orcamento?: number | null }>,
): number {
  return leads.reduce((sum, lead) => sum + (Number(lead.orcamento) || 0), 0);
}
