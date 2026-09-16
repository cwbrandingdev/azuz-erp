"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLeadMinerRecordsToCandidates = mapLeadMinerRecordsToCandidates;
const lead_miner_client_1 = require("./lead-miner.client");
function mapLeadMinerRecordsToCandidates(records, context) {
    const candidates = [];
    for (const record of records) {
        const phone = record.phone?.trim();
        const name = record.title?.trim();
        if (!name) {
            continue;
        }
        const contact = (0, lead_miner_client_1.parseLeadMinerWebsiteAndInstagram)(record.website, record.instagram);
        candidates.push({
            name,
            phone: phone || undefined,
            website: contact.website,
            instagram: contact.instagram,
            address: record.address?.trim() || undefined,
            city: context.city,
            neighborhood: context.neighborhood,
            category: record.category?.trim() || context.category,
            rating: record.rating,
            reviewsCount: record.reviews,
            source: 'leadminer',
            rawData: record,
        });
    }
    return candidates;
}
//# sourceMappingURL=lead-miner.mapper.js.map