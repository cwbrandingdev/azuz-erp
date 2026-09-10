"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramInsightsModule = void 0;
const common_1 = require("@nestjs/common");
const company_settings_module_1 = require("../../company-settings/company-settings.module");
const instagram_insights_service_1 = require("./application/instagram-insights.service");
const instagram_credentials_resolver_1 = require("./infrastructure/instagram-credentials.resolver");
const instagram_graph_client_1 = require("./infrastructure/instagram-graph.client");
const instagram_insights_controller_1 = require("./presentation/instagram-insights.controller");
let InstagramInsightsModule = class InstagramInsightsModule {
};
exports.InstagramInsightsModule = InstagramInsightsModule;
exports.InstagramInsightsModule = InstagramInsightsModule = __decorate([
    (0, common_1.Module)({
        imports: [company_settings_module_1.CompanySettingsModule],
        controllers: [instagram_insights_controller_1.InstagramInsightsController],
        providers: [
            instagram_graph_client_1.InstagramGraphClient,
            instagram_credentials_resolver_1.InstagramCredentialsResolver,
            instagram_insights_service_1.InstagramInsightsService,
        ],
        exports: [instagram_insights_service_1.InstagramInsightsService],
    })
], InstagramInsightsModule);
//# sourceMappingURL=instagram-insights.module.js.map