import type { Lead } from "@/services/types";

const CATALOG_PREVIEW_ID_PREFIX = "external:cnpj:";

function normalizeCnpjDigits(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

function readCnpjFromObject(obj: Record<string, unknown>): string | null {
  for (const key of ["cnpj", "CNPJ", "document", "cnpj_cpf"]) {
    const digits = normalizeCnpjDigits(obj[key]);
    if (digits) return digits;
  }
  return null;
}

export function formatCnpjBr(digits: string): string {
  const normalized = digits.replace(/\D/g, "");
  if (normalized.length !== 14) return digits;
  return normalized.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function extractCnpjFromLead(
  lead: Pick<Lead, "cnpj" | "placeId" | "rawData" | "id">,
): string | null {
  const fromField = normalizeCnpjDigits(lead.cnpj);
  if (fromField) return fromField;

  if (lead.id?.startsWith(CATALOG_PREVIEW_ID_PREFIX)) {
    const fromId = normalizeCnpjDigits(
      lead.id.slice(CATALOG_PREVIEW_ID_PREFIX.length),
    );
    if (fromId) return fromId;
  }

  if (lead.placeId?.startsWith("cnpj:")) {
    const fromPlace = normalizeCnpjDigits(lead.placeId.slice(5));
    if (fromPlace) return fromPlace;
  }

  if (!lead.rawData || typeof lead.rawData !== "object" || Array.isArray(lead.rawData)) {
    return null;
  }

  const record = lead.rawData as Record<string, unknown>;
  const direct = readCnpjFromObject(record);
  if (direct) return direct;

  const registry = record.registry;
  if (registry && typeof registry === "object" && !Array.isArray(registry)) {
    const fromRegistry = readCnpjFromObject(registry as Record<string, unknown>);
    if (fromRegistry) return fromRegistry;
  }

  const snapshot = record.registrySnapshot;
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const fromSnapshot = normalizeCnpjDigits(
      (snapshot as { cnpj?: unknown }).cnpj,
    );
    if (fromSnapshot) return fromSnapshot;
  }

  return null;
}

export function getLeadCnpjLabel(
  lead: Pick<Lead, "cnpj" | "placeId" | "rawData" | "id">,
): string | null {
  const digits = extractCnpjFromLead(lead);
  return digits ? formatCnpjBr(digits) : null;
}
