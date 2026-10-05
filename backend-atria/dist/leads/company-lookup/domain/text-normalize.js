"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCatalogText = normalizeCatalogText;
function normalizeCatalogText(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
//# sourceMappingURL=text-normalize.js.map