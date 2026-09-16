import type { LeadMinerLead } from "@/services/leadminer.service";
import type { AddLeadToKanbanInput, Lead } from "@/services/types";

export interface ExternalLeadSearchContext {
  city: string;
  neighborhood: string;
  category: string;
}

export function isExternalLeadId(id: string): boolean {
  return id.startsWith("external:");
}

export function externalLeadId(phone: string, index: number): string {
  return `external:${index}:${phone.replace(/\D/g, "")}`;
}

function parseLeadMinerWebsiteAndInstagram(
  website?: string | null,
  instagram?: string | null,
): { website: string | null; instagram: string | null } {
  const rawWebsite = website?.trim() ?? "";
  const rawInstagram = instagram?.trim() ?? "";

  if (rawInstagram) {
    return {
      instagram: rawInstagram,
      website:
        rawWebsite && !/instagram\.com/i.test(rawWebsite) ? rawWebsite : null,
    };
  }

  if (rawWebsite && /instagram\.com/i.test(rawWebsite)) {
    return { instagram: rawWebsite, website: null };
  }

  return { website: rawWebsite || null, instagram: null };
}

export function leadMinerLeadToPreviewLead(
  item: LeadMinerLead,
  context: ExternalLeadSearchContext,
  index: number,
): Lead {
  const phone = item.phone?.trim() ?? "";
  const name = item.title?.trim() || phone || "Lead externo";
  const contact = parseLeadMinerWebsiteAndInstagram(
    item.website,
    item.instagram,
  );

  return {
    id: externalLeadId(phone || String(index), index),
    companyId: "",
    name,
    phone: phone || null,
    email: null,
    website: contact.website,
    instagram: contact.instagram,
    address: item.address ?? null,
    city: context.city,
    neighborhood: context.neighborhood,
    category: item.category ?? context.category,
    placeId: null,
    rating: item.rating ?? null,
    reviewsCount: item.reviews ?? null,
    latitude: null,
    longitude: null,
    status: "PRE_VENDA",
    statusLabel: "Pré-venda",
    kanbanTracked: false,
    kanbanOrder: 0,
    aiScore: null,
    aiNotes: null,
    source: "leadminer",
    rawData: item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildAddToKanbanInput(
  lead: Lead,
  context?: ExternalLeadSearchContext,
  organizationId?: string,
): AddLeadToKanbanInput {
  const base = {
    organizationId,
    name: lead.name,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    website: lead.website ?? undefined,
    address: lead.address ?? undefined,
    city: lead.city ?? context?.city,
    neighborhood: lead.neighborhood ?? context?.neighborhood,
    category: lead.category ?? context?.category,
    placeId: lead.placeId ?? undefined,
    source: lead.source ?? "leadminer",
  };

  if (!isExternalLeadId(lead.id)) {
    return {
      leadId: lead.id,
      ...base,
    };
  }

  return base;
}

export function mergeExternalPreviewLeads(
  savedLeads: Lead[],
  previewLeads: Lead[],
): Lead[] {
  if (previewLeads.length === 0) return savedLeads;

  const savedKeys = new Set(
    savedLeads.map(
      (lead) =>
        `${lead.phone?.replace(/\D/g, "") ?? ""}:${lead.name.trim().toLowerCase()}`,
    ),
  );

  const pending = previewLeads.filter((lead) => {
    const key = `${lead.phone?.replace(/\D/g, "") ?? ""}:${lead.name.trim().toLowerCase()}`;
    return !savedKeys.has(key);
  });

  return [...pending, ...savedLeads];
}
