"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCnpjOnWebsite = findCnpjOnWebsite;
const cnpj_util_1 = require("./cnpj.util");
const EXTRA_PATHS = ['/contato', '/politica-de-privacidade', '/termos', '/privacy'];
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_CHARS = 400_000;
async function findCnpjOnWebsite(website) {
    const start = publicHttpUrl(website);
    if (!start) {
        return { cnpj: null, fetched: false };
    }
    const homepage = await fetchHtml(start);
    const fromHome = homepage ? (0, cnpj_util_1.extractValidCnpjs)(homepage)[0] : undefined;
    if (fromHome) {
        return { cnpj: fromHome, fetched: true };
    }
    const pages = await Promise.all(EXTRA_PATHS.map(async (path) => {
        const next = new URL(path, start);
        if (next.origin !== start.origin)
            return null;
        return fetchHtml(next);
    }));
    const fetched = homepage != null || pages.some((page) => page != null);
    for (const page of pages) {
        const cnpj = page ? (0, cnpj_util_1.extractValidCnpjs)(page)[0] : undefined;
        if (cnpj)
            return { cnpj, fetched: true };
    }
    return { cnpj: null, fetched };
}
function publicHttpUrl(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    let url;
    try {
        url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://')
            ? trimmed
            : `https://${trimmed}`);
    }
    catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
        return null;
    if (isBlockedHost(url.hostname))
        return null;
    return url;
}
function isBlockedHost(hostname) {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host === '::1' ||
        host === '0.0.0.0') {
        return true;
    }
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4)
        return false;
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127 || a === 0)
        return true;
    if (a === 169 && b === 254)
        return true;
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    if (a === 192 && b === 168)
        return true;
    return false;
}
async function fetchHtml(url) {
    let current = url;
    for (let hop = 0; hop < 3; hop += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(current, {
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    Accept: 'text/html,application/xhtml+xml',
                    'User-Agent': 'AtriaLeadDossier/1.0',
                },
            });
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (!location)
                    return null;
                const next = publicHttpUrl(new URL(location, current).toString());
                if (!next)
                    return null;
                current = next;
                continue;
            }
            if (!response.ok)
                return null;
            const type = response.headers.get('content-type') ?? '';
            if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) {
                return null;
            }
            const text = await response.text();
            return text.slice(0, MAX_CHARS);
        }
        catch {
            return null;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    return null;
}
//# sourceMappingURL=website-cnpj.finder.js.map