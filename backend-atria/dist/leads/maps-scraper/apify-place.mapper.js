"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapApifyPlaces = mapApifyPlaces;
exports.buildApifyActorInput = buildApifyActorInput;
function asOptionalString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}
function extractApifyPhone(place) {
    const direct = asOptionalString(place.phoneUnformatted ?? place.phone ?? place.companyPhoneNumber);
    if (direct) {
        return direct;
    }
    if (Array.isArray(place.phones)) {
        for (const phone of place.phones) {
            const normalized = asOptionalString(phone);
            if (normalized) {
                return normalized;
            }
        }
    }
    if (Array.isArray(place.contacts)) {
        for (const contact of place.contacts) {
            const phone = asOptionalString(contact.phoneUnformatted ?? contact.phone);
            if (phone) {
                return phone;
            }
        }
    }
    return undefined;
}
function extractApifyInstagram(place) {
    const instagrams = place.instagrams;
    if (!Array.isArray(instagrams)) {
        return undefined;
    }
    for (const entry of instagrams) {
        const normalized = normalizeInstagramUrl(entry);
        if (normalized) {
            return normalized;
        }
    }
    return undefined;
}
function normalizeInstagramUrl(value) {
    const raw = asOptionalString(value);
    if (!raw) {
        return undefined;
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }
    const handle = raw.replace(/^@/, "").trim();
    if (!handle) {
        return undefined;
    }
    return `https://www.instagram.com/${handle.replace(/^\/+/, "")}/`;
}
function extractApifyWebsite(place) {
    const website = asOptionalString(place.website ?? place.url ?? place.domain ?? place.menu);
    if (!website) {
        return undefined;
    }
    if (website.startsWith('http://') || website.startsWith('https://')) {
        return website;
    }
    return `https://${website}`;
}
function mapApifyPlaces(body, dto) {
    const places = (Array.isArray(body) ? body : []);
    const mapped = [];
    for (const place of places) {
        const name = asOptionalString(place.title ?? place.name);
        if (!name)
            continue;
        mapped.push({
            name,
            phone: extractApifyPhone(place),
            email: asOptionalString(place.email),
            website: extractApifyWebsite(place),
            instagram: extractApifyInstagram(place),
            address: asOptionalString(place.address),
            city: asOptionalString(place.city) ?? dto.city,
            neighborhood: asOptionalString(place.neighborhood) ?? dto.neighborhood,
            category: asOptionalString(place.categoryName ?? place.category) ?? dto.category,
            placeId: asOptionalString(place.placeId),
            rating: typeof place.totalScore === 'number' ? place.totalScore : undefined,
            reviewsCount: typeof place.reviewsCount === 'number' ? place.reviewsCount : undefined,
            latitude: typeof place.location?.lat === 'number' ? place.location.lat : undefined,
            longitude: typeof place.location?.lng === 'number' ? place.location.lng : undefined,
            source: 'apify',
            rawData: place,
        });
    }
    return mapped;
}
function buildApifyActorInput(dto, maxResults) {
    const category = dto.category.trim();
    const neighborhood = dto.neighborhood.trim();
    const city = dto.city.trim();
    return {
        searchStringsArray: [`${category} em ${neighborhood}, ${city}`],
        locationQuery: `${neighborhood}, ${city}, Brasil`,
        language: 'pt-BR',
        maxCrawledPlacesPerSearch: maxResults,
        scrapePlaceDetailPage: true,
        scrapeContacts: true,
        scrapeSocialMediaProfiles: {
            instagrams: true,
            facebooks: false,
            youtubes: false,
            tiktoks: false,
            twitters: false,
        },
    };
}
//# sourceMappingURL=apify-place.mapper.js.map