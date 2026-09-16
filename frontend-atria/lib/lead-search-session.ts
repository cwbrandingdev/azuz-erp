import type { Lead } from "@/services/types";
import type { LeadSearchSessionSummary } from "@/services/company-search.service";

export function formatSearchSessionLabel(
  session: LeadSearchSessionSummary,
): string {
  const typeLabel =
    session.queryType === "CNAE" ? "CNAE" : "Tipo de negócio";
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(session.createdAt));

  return `Pesquisa ${typeLabel} ${session.queryValue} - ${session.city}/${session.uf} - ${date}`;
}

export function filterLeadsByAddressContext(
  leads: Lead[],
  addressContext: string,
): Lead[] {
  const query = normalizeText(addressContext);
  if (!query) {
    return leads;
  }

  return leads.filter((lead) => {
    const haystack = normalizeText(
      [lead.address, lead.neighborhood, lead.city].filter(Boolean).join(" "),
    );
    return haystack.includes(query);
  });
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export { getLeadsWithCoordinates } from "@/lib/lead-map-utils";
