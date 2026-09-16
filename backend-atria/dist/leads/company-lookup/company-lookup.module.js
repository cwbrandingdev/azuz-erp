"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyLookupModule = void 0;
const common_1 = require("@nestjs/common");
const cnae_resolver_service_1 = require("./application/cnae-resolver.service");
const company_discovery_service_1 = require("./application/company-discovery.service");
const company_lookup_service_1 = require("./application/company-lookup.service");
const lead_search_session_service_1 = require("./application/lead-search-session.service");
const brasil_api_cnpj_client_1 = require("./infrastructure/brasil-api-cnpj.client");
const ibge_cnae_client_1 = require("./infrastructure/ibge-cnae.client");
const minha_receita_client_1 = require("./infrastructure/minha-receita.client");
const lead_miner_client_1 = require("./infrastructure/lead-miner.client");
const nominatim_client_1 = require("./infrastructure/nominatim.client");
let CompanyLookupModule = class CompanyLookupModule {
};
exports.CompanyLookupModule = CompanyLookupModule;
exports.CompanyLookupModule = CompanyLookupModule = __decorate([
    (0, common_1.Module)({
        providers: [
            brasil_api_cnpj_client_1.BrasilApiCnpjClient,
            minha_receita_client_1.MinhaReceitaClient,
            nominatim_client_1.NominatimClient,
            ibge_cnae_client_1.IbgeCnaeClient,
            lead_miner_client_1.LeadMinerClient,
            cnae_resolver_service_1.CnaeResolverService,
            company_lookup_service_1.CompanyLookupService,
            company_discovery_service_1.CompanyDiscoveryService,
            lead_search_session_service_1.LeadSearchSessionService,
        ],
        exports: [
            lead_search_session_service_1.LeadSearchSessionService,
            cnae_resolver_service_1.CnaeResolverService,
            company_lookup_service_1.CompanyLookupService,
        ],
    })
], CompanyLookupModule);
//# sourceMappingURL=company-lookup.module.js.map