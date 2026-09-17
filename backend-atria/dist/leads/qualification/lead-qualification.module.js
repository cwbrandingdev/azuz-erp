"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadQualificationModule = void 0;
const common_1 = require("@nestjs/common");
const company_lookup_module_1 = require("../company-lookup/company-lookup.module");
const commercial_fit_service_1 = require("./commercial-fit.service");
const instagram_apify_enricher_1 = require("./instagram-apify.enricher");
const lead_qualification_service_1 = require("./lead-qualification.service");
let LeadQualificationModule = class LeadQualificationModule {
};
exports.LeadQualificationModule = LeadQualificationModule;
exports.LeadQualificationModule = LeadQualificationModule = __decorate([
    (0, common_1.Module)({
        imports: [company_lookup_module_1.CompanyLookupModule],
        providers: [
            instagram_apify_enricher_1.InstagramApifyEnricher,
            commercial_fit_service_1.CommercialFitService,
            lead_qualification_service_1.LeadQualificationService,
        ],
        exports: [lead_qualification_service_1.LeadQualificationService],
    })
], LeadQualificationModule);
//# sourceMappingURL=lead-qualification.module.js.map