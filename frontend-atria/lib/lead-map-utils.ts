import type { Lead } from "@/services/types";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export function getLeadsWithCoordinates(leads: Lead[]): Lead[] {
  return leads.filter((lead) => getLeadCoordinate(lead) !== null);
}

export function getLeadCoordinate(lead: Lead): MapCoordinate | null {
  if (
    typeof lead.latitude !== "number" ||
    typeof lead.longitude !== "number" ||
    !Number.isFinite(lead.latitude) ||
    !Number.isFinite(lead.longitude)
  ) {
    return null;
  }

  return {
    latitude: lead.latitude,
    longitude: lead.longitude,
  };
}

export function getLeadCompanyNames(lead: Lead): {
  displayName: string;
  legalName?: string;
  tradeName?: string;
} {
  const rawData =
    lead.rawData && typeof lead.rawData === "object"
      ? (lead.rawData as Record<string, unknown>)
      : null;

  const legalName =
    typeof rawData?.razao_social === "string"
      ? rawData.razao_social.trim()
      : undefined;
  const tradeName =
    typeof rawData?.nome_fantasia === "string"
      ? rawData.nome_fantasia.trim()
      : lead.name.trim();

  const displayName = tradeName || legalName || lead.name;

  return {
    displayName,
    legalName: legalName && legalName !== tradeName ? legalName : undefined,
    tradeName,
  };
}

export function getLeadCnaeLabel(lead: Lead): string | undefined {
  if (lead.category?.trim()) {
    return lead.category.trim();
  }

  const rawData =
    lead.rawData && typeof lead.rawData === "object"
      ? (lead.rawData as Record<string, unknown>)
      : null;

  const code =
    typeof rawData?.cnae_fiscal === "number"
      ? String(rawData.cnae_fiscal)
      : typeof rawData?.cnae_fiscal === "string"
        ? rawData.cnae_fiscal
        : undefined;

  const description =
    typeof rawData?.cnae_fiscal_descricao === "string"
      ? rawData.cnae_fiscal_descricao.trim()
      : undefined;

  if (code && description) {
    return `${code} — ${description}`;
  }

  return code ?? description;
}

export function formatInstagramHandle(
  instagram: string | null | undefined,
): string | null {
  if (!instagram?.trim()) {
    return null;
  }

  const value = instagram.trim();
  const match = value.match(/instagram\.com\/([^/?#]+)/i);
  if (match?.[1]) {
    return `@${match[1]}`;
  }

  return value.startsWith("@") ? value : `@${value.replace(/^@/, "")}`;
}

export function formatLeadRating(
  rating: number | null | undefined,
  reviewsCount: number | null | undefined,
): string | null {
  if (rating == null && reviewsCount == null) {
    return null;
  }

  const ratingText =
    typeof rating === "number" && Number.isFinite(rating)
      ? rating.toFixed(1)
      : null;
  const reviewsText =
    typeof reviewsCount === "number" && Number.isFinite(reviewsCount)
      ? `${reviewsCount.toLocaleString("pt-BR")} avaliações`
      : null;

  if (ratingText && reviewsText) {
    return `${ratingText} · ${reviewsText}`;
  }

  return ratingText ?? reviewsText;
}

export function formatLeadPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) {
    return "Não informado";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone.trim();
}
