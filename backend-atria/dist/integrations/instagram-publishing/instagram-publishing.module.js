"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramPublishingModule = void 0;
const common_1 = require("@nestjs/common");
const company_settings_module_1 = require("../../company-settings/company-settings.module");
const supabase_module_1 = require("../../supabase/supabase.module");
const instagram_credentials_resolver_1 = require("../instagram-insights/infrastructure/instagram-credentials.resolver");
const instagram_graph_client_1 = require("../instagram-insights/infrastructure/instagram-graph.client");
const instagram_publish_media_resolver_1 = require("./instagram-publish-media.resolver");
const instagram_publish_scheduler_service_1 = require("./instagram-publish-scheduler.service");
const instagram_publishing_service_1 = require("./instagram-publishing.service");
let InstagramPublishingModule = class InstagramPublishingModule {
};
exports.InstagramPublishingModule = InstagramPublishingModule;
exports.InstagramPublishingModule = InstagramPublishingModule = __decorate([
    (0, common_1.Module)({
        imports: [company_settings_module_1.CompanySettingsModule, supabase_module_1.SupabaseModule],
        providers: [
            instagram_graph_client_1.InstagramGraphClient,
            instagram_credentials_resolver_1.InstagramCredentialsResolver,
            instagram_publish_media_resolver_1.InstagramPublishMediaResolver,
            instagram_publishing_service_1.InstagramPublishingService,
            instagram_publish_scheduler_service_1.InstagramPublishSchedulerService,
        ],
        exports: [instagram_publishing_service_1.InstagramPublishingService],
    })
], InstagramPublishingModule);
//# sourceMappingURL=instagram-publishing.module.js.map