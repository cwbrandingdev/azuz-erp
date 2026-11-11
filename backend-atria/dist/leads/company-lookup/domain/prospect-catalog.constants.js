"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROSPECT_CATALOG_ALLOWED_UFS = void 0;
exports.isProspectCatalogAllowedUf = isProspectCatalogAllowedUf;
exports.PROSPECT_CATALOG_ALLOWED_UFS = ['SP', 'PR'];
function isProspectCatalogAllowedUf(uf) {
    const normalized = uf.trim().toUpperCase();
    return exports.PROSPECT_CATALOG_ALLOWED_UFS.includes(normalized);
}
//# sourceMappingURL=prospect-catalog.constants.js.map