import type { Lead } from '@prisma/client';

export type CnpjMatchMethod =
  | 'existing_cnpj'
  | 'website'
  | 'phone'
  | 'name_city';

export interface RegistrySnapshot {
  cnpj: string;
  capitalSocial: number | null;
  legalName: string | null;
  companySize?: string | null;
  matchMethod?: CnpjMatchMethod;
  fetchedAt: string;
}

export type RegistryLookupStatus = 'not_found' | 'unavailable';

export interface RegistryLookupCache {
  status: RegistryLookupStatus;
  fetchedAt: string;
}

const PORTE_BY_CODE: Record<string, string> = {
  '00': 'Não informado',
  '01': 'Microempresa',
  '03': 'Empresa de pequeno porte',
  '05': 'Demais',
};

export function formatCompanySize(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');
  if (
    digits &&
    (digits === raw || raw.length <= 2) &&
    PORTE_BY_CODE[digits.padStart(2, '0')]
  ) {
    return PORTE_BY_CODE[digits.padStart(2, '0')];
  }
  const upper = raw.toUpperCase();
  if (upper === 'ME' || upper.includes('MICRO')) return 'Microempresa';
  if (upper === 'EPP' || upper.includes('PEQUENO PORTE')) {
    return 'Empresa de pequeno porte';
  }
  if (upper.includes('DEMAIS')) return 'Demais';
  return raw;
}

export function readCompanySizeLabel(
  raw: Record<string, unknown> | null | undefined,
): string | null {
  if (!raw) return null;
  const labeled =
    raw.porte ?? raw.descricao_porte ?? raw.descricao_porte_empresa;
  if (
    typeof labeled === 'string' &&
    labeled.trim() &&
    !/^\d+$/.test(labeled.trim())
  ) {
    return formatCompanySize(labeled);
  }
  const code = raw.codigo_porte ?? raw.companySize ?? labeled;
  if (typeof code === 'number' && Number.isFinite(code)) {
    return formatCompanySize(String(Math.trunc(code)).padStart(2, '0'));
  }
  if (typeof code === 'string' && code.trim()) {
    return formatCompanySize(code);
  }
  return null;
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

const REGISTRY_MISS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const REGISTRY_UNAVAILABLE_CACHE_MS = 15 * 60 * 1000;

export function readRegistryLookupCache(
  rawData: unknown,
): RegistryLookupCache | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }
  const lookup = (rawData as Record<string, unknown>).registryLookup;
  if (!lookup || typeof lookup !== 'object' || Array.isArray(lookup)) {
    return null;
  }
  const data = lookup as RegistryLookupCache;
  if (data.status !== 'not_found' && data.status !== 'unavailable') {
    return null;
  }
  const fetchedAt = Date.parse(data.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return null;
  const maxAge =
    data.status === 'not_found'
      ? REGISTRY_MISS_CACHE_MS
      : REGISTRY_UNAVAILABLE_CACHE_MS;
  if (Date.now() - fetchedAt >= maxAge) return null;
  return data;
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
