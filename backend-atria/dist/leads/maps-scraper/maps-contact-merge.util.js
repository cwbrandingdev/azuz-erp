"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAPS_ENRICHMENT_CACHE_MS = void 0;
exports.leadNeedsMapsContactEnrichment = leadNeedsMapsContactEnrichment;
exports.instagramUrlFromValue = instagramUrlFromValue;
exports.contactGapsFromPlace = contactGapsFromPlace;
exports.readCachedMapsEnrichment = readCachedMapsEnrichment;
exports.mergeMapsEnrichmentIntoRawData = mergeMapsEnrichmentIntoRawData;
exports.mostCommonNeighborhood = mostCommonNeighborhood;
exports.MAPS_ENRICHMENT_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
function leadNeedsMapsContactEnrichment(lead) {
    return (!lead.instagram?.trim() || !lead.website?.trim() || lead.rating == null);
}
function instagramUrlFromValue(value) {
    const raw = value?.trim();
    if (!raw)
        return undefined;
    const fromUrl = raw.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)?.[1];
    if (fromUrl) {
        return `https://www.instagram.com/${fromUrl.replace(/\/$/, '').toLowerCase()}/`;
    }
    return undefined;
}
function contactGapsFromPlace(lead, place) {
    const updates = {};
    const instagram = instagramUrlFromValue(place.instagram) ??
        instagramUrlFromValue(place.website) ??
        instagramUrlFromValue(lead.website);
    if (!lead.instagram?.trim() && instagram) {
        updates.instagram = instagram;
    }
    if (!lead.website?.trim() && place.website?.trim()) {
        const website = place.website.trim();
        if (!/instagram\.com/i.test(website)) {
            updates.website = website;
        }
    }
    if (!lead.phone?.trim() && place.phone?.trim()) {
        updates.phone = place.phone.trim();
    }
    if (lead.rating == null && typeof place.rating === 'number') {
        updates.rating = place.rating;
    }
    if (lead.reviewsCount == null && typeof place.reviewsCount === 'number') {
        updates.reviewsCount = place.reviewsCount;
    }
    if (!lead.address?.trim() && place.address?.trim()) {
        updates.address = place.address.trim();
    }
    if (!lead.neighborhood?.trim() && place.neighborhood?.trim()) {
        updates.neighborhood = place.neighborhood.trim();
    }
    if (lead.latitude == null && typeof place.latitude === 'number') {
        updates.latitude = place.latitude;
    }
    if (lead.longitude == null && typeof place.longitude === 'number') {
        updates.longitude = place.longitude;
    }
    return updates;
}
function readCachedMapsEnrichment(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const snapshot = rawData.mapsEnrichment;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        return null;
    }
    const data = snapshot;
    if (!data.fetchedAt ||
        Date.parse(data.fetchedAt) < Date.now() - exports.MAPS_ENRICHMENT_CACHE_MS) {
        return null;
    }
    return data;
}
function mergeMapsEnrichmentIntoRawData(rawData, snapshot) {
    const base = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
        ? { ...rawData }
        : {};
    base.mapsEnrichment = snapshot;
    return base;
}
function mostCommonNeighborhood(values, fallback) {
    const counts = new Map();
    for (const value of values) {
        const trimmed = value?.trim();
        if (!trimmed)
            continue;
        counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
    let best = fallback;
    let bestCount = 0;
    for (const [name, count] of counts) {
        if (count > bestCount) {
            best = name;
            bestCount = count;
        }
    }
    return best;
}
//# sourceMappingURL=maps-contact-merge.util.js.map