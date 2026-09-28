import type { LeadKanbanColumn, LeadStatus } from "@/services/types";

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
