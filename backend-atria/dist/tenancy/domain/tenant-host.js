"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORWARDED_HOST_HEADER = exports.TENANT_SLUG_HEADER = void 0;
exports.parseBaseDomains = parseBaseDomains;
exports.normalizeBaseDomain = normalizeBaseDomain;
exports.readHostHeader = readHostHeader;
exports.readExplicitTenantSlug = readExplicitTenantSlug;
exports.isTenantAwareCorsOrigin = isTenantAwareCorsOrigin;
exports.isAllowedCorsOrigin = isAllowedCorsOrigin;
exports.extractTenantSlug = extractTenantSlug;
exports.isTenantSlug = isTenantSlug;
exports.TENANT_SLUG_HEADER = 'x-tenant-slug';
exports.FORWARDED_HOST_HEADER = 'x-forwarded-host';
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^\[?[0-9a-f:]+\]?$/i;
function parseBaseDomains(raw) {
    if (!raw) {
        return [];
    }
    const seen = new Set();
    const domains = [];
    for (const part of raw.split(',')) {
        const domain = normalizeBaseDomain(part);
        if (!domain || seen.has(domain)) {
            continue;
        }
        seen.add(domain);
        domains.push(domain);
    }
    return domains.sort((left, right) => right.length - left.length);
}
function normalizeBaseDomain(value) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }
    try {
        const candidate = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
        const hostname = new URL(candidate).hostname.trim().toLowerCase();
        return hostname.replace(/^\.+/, '') || null;
    }
    catch {
        const fallback = trimmed.replace(/^\.+/, '').replace(/:\d+$/, '');
        return fallback || null;
    }
}
function readHostHeader(headers) {
    const forwarded = firstHeaderValue(headers[exports.FORWARDED_HOST_HEADER]);
    if (forwarded) {
        return forwarded;
    }
    return firstHeaderValue(headers.host);
}
function readExplicitTenantSlug(headers) {
    const value = firstHeaderValue(headers[exports.TENANT_SLUG_HEADER])?.toLowerCase();
    if (!value || !isTenantSlug(value)) {
        return null;
    }
    return value;
}
function isTenantAwareCorsOrigin(origin, baseDomains) {
    try {
        const url = new URL(origin);
        if (extractTenantSlug(url.host, baseDomains)) {
            return true;
        }
        const hostname = url.hostname.trim().toLowerCase();
        return baseDomains.some((base) => normalizeBaseDomain(base) === hostname);
    }
    catch {
        return false;
    }
}
function isAllowedCorsOrigin(origin, allowedOrigins, baseDomains) {
    if (!origin || allowedOrigins.includes(origin)) {
        return true;
    }
    return isTenantAwareCorsOrigin(origin, baseDomains);
}
function extractTenantSlug(hostHeader, baseDomains) {
    const hostname = parseHostname(hostHeader);
    if (!hostname || isIpAddress(hostname)) {
        return null;
    }
    const domains = [...baseDomains]
        .map((domain) => normalizeBaseDomain(domain))
        .filter((domain) => Boolean(domain))
        .sort((left, right) => right.length - left.length);
    for (const base of domains) {
        if (hostname === base) {
            return null;
        }
        const suffix = `.${base}`;
        if (!hostname.endsWith(suffix)) {
            continue;
        }
        const remainder = hostname.slice(0, -suffix.length);
        const slug = remainder.split('.')[0]?.trim().toLowerCase();
        if (!slug || !isTenantSlug(slug)) {
            return null;
        }
        return slug;
    }
    return null;
}
function firstHeaderValue(value) {
    if (!value) {
        return undefined;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    return raw.split(',')[0]?.trim() || undefined;
}
function parseHostname(hostHeader) {
    if (!hostHeader) {
        return null;
    }
    const first = hostHeader.split(',')[0]?.trim().toLowerCase();
    if (!first) {
        return null;
    }
    if (first.startsWith('[')) {
        const end = first.indexOf(']');
        if (end > 1) {
            return first.slice(1, end);
        }
    }
    return first.replace(/:\d+$/, '') || null;
}
function isIpAddress(hostname) {
    return IPV4_PATTERN.test(hostname) || IPV6_PATTERN.test(hostname);
}
function isTenantSlug(slug) {
    if (slug === 'www') {
        return false;
    }
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);
}
//# sourceMappingURL=tenant-host.js.map