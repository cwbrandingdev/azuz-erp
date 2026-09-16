"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeocodingError = exports.CompanyDiscoveryError = exports.CompanyLookupError = void 0;
class CompanyLookupError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'CompanyLookupError';
    }
}
exports.CompanyLookupError = CompanyLookupError;
class CompanyDiscoveryError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'CompanyDiscoveryError';
    }
}
exports.CompanyDiscoveryError = CompanyDiscoveryError;
class GeocodingError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'GeocodingError';
    }
}
exports.GeocodingError = GeocodingError;
//# sourceMappingURL=company-lookup.errors.js.map