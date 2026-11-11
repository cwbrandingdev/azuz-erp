"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSerpApiPlaces = mapSerpApiPlaces;
exports.buildSerpApiMapsQuery = buildSerpApiMapsQuery;
function asOptionalString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}
function normalizeInstagramUrl(value) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
    }
    const handle = value.replace(/^@/, '').trim();
    if (!handle)
        return undefined;
    return `https://www.instagram.com/${handle.replace(/^\/+/, '')}/`;
}
function splitWebsiteAndInstagram(websiteRaw) {
    const raw = asOptionalString(websiteRaw);
    if (!raw)
        return {};
    if (/instagram\.com/i.test(raw)) {
        return {
            instagram: normalizeInstagramUrl(raw),
            website: undefined,
        };
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return { website: raw };
    }
    return { website: `https://${raw}` };
}
function flattenLocalResults(body) {
    if (typeof body !== 'object' || body === null)
        return [];
    const record = body;
    const local = record.local_results;
    if (Array.isArray(local)) {
        return local;
    }
    if (typeof local === 'object' && local !== null) {
        const nested = local;
        if (Array.isArray(nested.places)) {
            return nested.places;
        }
    }
    return [];
}
function mapSerpApiPlaces(body, dto) {
    const places = flattenLocalResults(body);
    const mapped = [];
    for (const place of places) {
        const name = asOptionalString(place.title);
        if (!name)
            continue;
        const contact = splitWebsiteAndInstagram(place.website);
        const category = asOptionalString(place.type) ??
            (Array.isArray(place.types)
                ? asOptionalString(place.types[0])
                : undefined);
        mapped.push({
            name,
            phone: asOptionalString(place.phone),
            website: contact.website,
            instagram: contact.instagram,
            address: asOptionalString(place.address),
            city: dto.city,
            neighborhood: dto.neighborhood,
            category: category ?? dto.category,
            placeId: asOptionalString(place.place_id),
            rating: typeof place.rating === 'number' ? place.rating : undefined,
            reviewsCount: typeof place.reviews === 'number' ? place.reviews : undefined,
            latitude: typeof place.gps_coordinates?.latitude === 'number'
                ? place.gps_coordinates.latitude
                : undefined,
            longitude: typeof place.gps_coordinates?.longitude === 'number'
                ? place.gps_coordinates.longitude
                : undefined,
            source: 'serpapi',
            rawData: place,
        });
    }
    return mapped;
}
function buildSerpApiMapsQuery(dto) {
    const category = dto.category.trim();
    const neighborhood = dto.neighborhood.trim();
    const city = dto.city.trim();
    return `${category} em ${neighborhood}, ${city}`;
}
//# sourceMappingURL=serpapi-place.mapper.js.map