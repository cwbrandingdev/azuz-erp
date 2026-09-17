import type { Lead } from '@prisma/client';

export interface RegistrySnapshot {
  cnpj: string;
  capitalSocial: number | null;
  legalName: string | null;
  fetchedAt: string;
}

const REGISTRY_CACHE_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeCnpjDigits(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 14 ? digits : null;
}

function readCnpjFromObject(obj: Record<string, unknown>): string | null {
  for (const key of ['cnpj', 'CNPJ', 'document', 'cnpj_cpf']) {
    const digits = normalizeCnpjDigits(obj[key]);
    if (digits) return digits;
  }
  return null;
}

export function extractCnpjFromRawData(
  rawData: unknown,
  placeId?: string | null,
): string | null {
  if (placeId?.startsWith('cnpj:')) {
    const digits = placeId.slice(5).replace(/\D/g, '');
    if (digits.length === 14) return digits;
  }

  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }

  const record = rawData as Record<string, unknown>;

  const direct = readCnpjFromObject(record);
  if (direct) return direct;

  const registry = record.registry;
  if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
    const fromRegistry = readCnpjFromObject(registry as Record<string, unknown>);
    if (fromRegistry) return fromRegistry;
  }

  const leadMiner = record.leadMiner;
  if (leadMiner && typeof leadMiner === 'object' && !Array.isArray(leadMiner)) {
    const fromMiner = readCnpjFromObject(leadMiner as Record<string, unknown>);
    if (fromMiner) return fromMiner;
  }

  const snapshot = record.registrySnapshot;
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const fromSnapshot = normalizeCnpjDigits((snapshot as RegistrySnapshot).cnpj);
    if (fromSnapshot) return fromSnapshot;
  }

  return null;
}

export function extractCnpjFromLead(lead: Lead): string | null {
  return extractCnpjFromRawData(lead.rawData, lead.placeId);
}

export function parseShareCapital(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function readShareCapitalFromRegistryObject(
  reg: Record<string, unknown>,
): number | null {
  return (
    parseShareCapital(reg.capital_social) ??
    parseShareCapital(reg.capitalSocial) ??
    parseShareCapital(reg.shareCapital)
  );
}

export function readShareCapitalFromRawData(rawData: unknown): number | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }

  const record = rawData as Record<string, unknown>;

  const snapshot = record.registrySnapshot;
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const fromSnapshot = parseShareCapital(
      (snapshot as RegistrySnapshot).capitalSocial,
    );
    if (fromSnapshot != null) return fromSnapshot;
  }

  const registry = record.registry;
  if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
    const fromRegistry = readShareCapitalFromRegistryObject(
      registry as Record<string, unknown>,
    );
    if (fromRegistry != null) return fromRegistry;
  }

  const leadMiner = record.leadMiner;
  if (leadMiner && typeof leadMiner === 'object' && !Array.isArray(leadMiner)) {
    const fromMiner = readShareCapitalFromRegistryObject(
      leadMiner as Record<string, unknown>,
    );
    if (fromMiner != null) return fromMiner;
  }

  return (
    parseShareCapital(record.capital_social) ??
    parseShareCapital(record.capitalSocial) ??
    parseShareCapital(record.shareCapital)
  );
}

export function readLegalNameFromRawData(rawData: unknown): string | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }
  const record = rawData as Record<string, unknown>;
  const snapshot = record.registrySnapshot;
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const name = (snapshot as RegistrySnapshot).legalName;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }

  const registry = record.registry;
  if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
    const reg = registry as Record<string, unknown>;
    for (const key of [
      'razao_social',
      'nome_fantasia',
      'legalName',
      'tradeName',
    ]) {
      const value = reg[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }

  for (const key of ['razao_social', 'nome_fantasia', 'legalName']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

export function readCachedRegistrySnapshot(
  rawData: unknown,
): RegistrySnapshot | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }

  const snapshot = (rawData as Record<string, unknown>).registrySnapshot;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  const data = snapshot as RegistrySnapshot;
  if (
    !data.fetchedAt ||
    Date.parse(data.fetchedAt) < Date.now() - REGISTRY_CACHE_MS
  ) {
    return null;
  }

  return data;
}

export function readShareCapitalFromLead(lead: Lead): number | null {
  return readShareCapitalFromRawData(lead.rawData);
}

export function leadHasIdentifiableCnpj(lead: Lead): boolean {
  return extractCnpjFromLead(lead) != null;
}

export function mergeRegistrySnapshotIntoRawData(
  rawData: unknown,
  snapshot: RegistrySnapshot,
): Record<string, unknown> {
  const base =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? { ...(rawData as Record<string, unknown>) }
      : {};

  base.registrySnapshot = snapshot;
  base.cnpj = snapshot.cnpj;
  return base;
}

/** Persist snapshot when CNPJ + capital já existem no rawData (ex.: busca CNAE). */
export function materializeRegistrySnapshotFromRawData(
  rawData: unknown,
  placeId?: string | null,
): Record<string, unknown> {
  const base =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? { ...(rawData as Record<string, unknown>) }
      : {};

  if (readCachedRegistrySnapshot(base)) {
    return base;
  }

  const cnpj = extractCnpjFromRawData(base, placeId);
  if (!cnpj) {
    return base;
  }

  const capitalSocial = readShareCapitalFromRawData(base);
  if (capitalSocial == null) {
    return base;
  }

  return mergeRegistrySnapshotIntoRawData(base, {
    cnpj,
    capitalSocial,
    legalName: readLegalNameFromRawData(base),
    fetchedAt: new Date().toISOString(),
  });
}
