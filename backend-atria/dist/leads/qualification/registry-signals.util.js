"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCompanySize = formatCompanySize;
exports.readCompanySizeLabel = readCompanySizeLabel;
exports.extractCnpjFromRawData = extractCnpjFromRawData;
exports.extractCnpjFromLead = extractCnpjFromLead;
exports.parseShareCapital = parseShareCapital;
exports.readShareCapitalFromRawData = readShareCapitalFromRawData;
exports.readLegalNameFromRawData = readLegalNameFromRawData;
exports.readRegistryLookupCache = readRegistryLookupCache;
exports.readCachedRegistrySnapshot = readCachedRegistrySnapshot;
exports.readShareCapitalFromLead = readShareCapitalFromLead;
exports.leadHasIdentifiableCnpj = leadHasIdentifiableCnpj;
exports.mergeRegistrySnapshotIntoRawData = mergeRegistrySnapshotIntoRawData;
exports.materializeRegistrySnapshotFromRawData = materializeRegistrySnapshotFromRawData;
const PORTE_BY_CODE = {
    '00': 'Não informado',
    '01': 'Microempresa',
    '03': 'Empresa de pequeno porte',
    '05': 'Demais',
};
function formatCompanySize(value) {
    if (!value?.trim())
        return null;
    const raw = value.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits &&
        (digits === raw || raw.length <= 2) &&
        PORTE_BY_CODE[digits.padStart(2, '0')]) {
        return PORTE_BY_CODE[digits.padStart(2, '0')];
    }
    const upper = raw.toUpperCase();
    if (upper === 'ME' || upper.includes('MICRO'))
        return 'Microempresa';
    if (upper === 'EPP' || upper.includes('PEQUENO PORTE')) {
        return 'Empresa de pequeno porte';
    }
    if (upper.includes('DEMAIS'))
        return 'Demais';
    return raw;
}
function readCompanySizeLabel(raw) {
    if (!raw)
        return null;
    const labeled = raw.porte ?? raw.descricao_porte ?? raw.descricao_porte_empresa;
    if (typeof labeled === 'string' &&
        labeled.trim() &&
        !/^\d+$/.test(labeled.trim())) {
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
function normalizeCnpjDigits(value) {
    if (value == null)
        return null;
    const digits = String(value).replace(/\D/g, '');
    return digits.length === 14 ? digits : null;
}
function readCnpjFromObject(obj) {
    for (const key of ['cnpj', 'CNPJ', 'document', 'cnpj_cpf']) {
        const digits = normalizeCnpjDigits(obj[key]);
        if (digits)
            return digits;
    }
    return null;
}
function extractCnpjFromRawData(rawData, placeId) {
    if (placeId?.startsWith('cnpj:')) {
        const digits = placeId.slice(5).replace(/\D/g, '');
        if (digits.length === 14)
            return digits;
    }
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const record = rawData;
    const direct = readCnpjFromObject(record);
    if (direct)
        return direct;
    const registry = record.registry;
    if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
        const fromRegistry = readCnpjFromObject(registry);
        if (fromRegistry)
            return fromRegistry;
    }
    const leadMiner = record.leadMiner;
    if (leadMiner && typeof leadMiner === 'object' && !Array.isArray(leadMiner)) {
        const fromMiner = readCnpjFromObject(leadMiner);
        if (fromMiner)
            return fromMiner;
    }
    const snapshot = record.registrySnapshot;
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
        const fromSnapshot = normalizeCnpjDigits(snapshot.cnpj);
        if (fromSnapshot)
            return fromSnapshot;
    }
    return null;
}
function extractCnpjFromLead(lead) {
    return extractCnpjFromRawData(lead.rawData, lead.placeId);
}
function parseShareCapital(value) {
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
function readShareCapitalFromRegistryObject(reg) {
    return (parseShareCapital(reg.capital_social) ??
        parseShareCapital(reg.capitalSocial) ??
        parseShareCapital(reg.shareCapital));
}
function readShareCapitalFromRawData(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const record = rawData;
    const snapshot = record.registrySnapshot;
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
        const fromSnapshot = parseShareCapital(snapshot.capitalSocial);
        if (fromSnapshot != null)
            return fromSnapshot;
    }
    const registry = record.registry;
    if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
        const fromRegistry = readShareCapitalFromRegistryObject(registry);
        if (fromRegistry != null)
            return fromRegistry;
    }
    const leadMiner = record.leadMiner;
    if (leadMiner && typeof leadMiner === 'object' && !Array.isArray(leadMiner)) {
        const fromMiner = readShareCapitalFromRegistryObject(leadMiner);
        if (fromMiner != null)
            return fromMiner;
    }
    return (parseShareCapital(record.capital_social) ??
        parseShareCapital(record.capitalSocial) ??
        parseShareCapital(record.shareCapital));
}
function readLegalNameFromRawData(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const record = rawData;
    const snapshot = record.registrySnapshot;
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
        const name = snapshot.legalName;
        if (typeof name === 'string' && name.trim())
            return name.trim();
    }
    const registry = record.registry;
    if (registry && typeof registry === 'object' && !Array.isArray(registry)) {
        const reg = registry;
        for (const key of [
            'razao_social',
            'nome_fantasia',
            'legalName',
            'tradeName',
        ]) {
            const value = reg[key];
            if (typeof value === 'string' && value.trim())
                return value.trim();
        }
    }
    for (const key of ['razao_social', 'nome_fantasia', 'legalName']) {
        const value = record[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return null;
}
const REGISTRY_MISS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const REGISTRY_UNAVAILABLE_CACHE_MS = 15 * 60 * 1000;
function readRegistryLookupCache(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const lookup = rawData.registryLookup;
    if (!lookup || typeof lookup !== 'object' || Array.isArray(lookup)) {
        return null;
    }
    const data = lookup;
    if (data.status !== 'not_found' && data.status !== 'unavailable') {
        return null;
    }
    const fetchedAt = Date.parse(data.fetchedAt);
    if (!Number.isFinite(fetchedAt))
        return null;
    const maxAge = data.status === 'not_found'
        ? REGISTRY_MISS_CACHE_MS
        : REGISTRY_UNAVAILABLE_CACHE_MS;
    if (Date.now() - fetchedAt >= maxAge)
        return null;
    return data;
}
function readCachedRegistrySnapshot(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const snapshot = rawData.registrySnapshot;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        return null;
    }
    const data = snapshot;
    if (!data.fetchedAt ||
        Date.parse(data.fetchedAt) < Date.now() - REGISTRY_CACHE_MS) {
        return null;
    }
    return data;
}
function readShareCapitalFromLead(lead) {
    return readShareCapitalFromRawData(lead.rawData);
}
function leadHasIdentifiableCnpj(lead) {
    return extractCnpjFromLead(lead) != null;
}
function mergeRegistrySnapshotIntoRawData(rawData, snapshot) {
    const base = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
        ? { ...rawData }
        : {};
    base.registrySnapshot = snapshot;
    base.cnpj = snapshot.cnpj;
    return base;
}
function materializeRegistrySnapshotFromRawData(rawData, placeId) {
    const base = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
        ? { ...rawData }
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
//# sourceMappingURL=registry-signals.util.js.map