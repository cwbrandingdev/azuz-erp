"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaPublishingModule = void 0;
const common_1 = require("@nestjs/common");
const notifications_module_1 = require("../../notifications/notifications.module");
const instagram_insights_module_1 = require("../instagram-insights/instagram-insights.module");
const meta_oauth_controller_1 = require("./meta-oauth.controller");
const meta_oauth_service_1 = require("./meta-oauth.service");
const meta_publishing_service_1 = require("./meta-publishing.service");
const meta_publishing_sync_service_1 = require("./meta-publishing.sync.service");
let MetaPublishingModule = class MetaPublishingModule {
};
exports.MetaPublishingModule = MetaPublishingModule;
exports.MetaPublishingModule = MetaPublishingModule = __decorate([
    (0, common_1.Module)({
        imports: [instagram_insights_module_1.InstagramInsightsModule, notifications_module_1.NotificationsModule],
        controllers: [meta_oauth_controller_1.MetaOAuthController],
        providers: [
            meta_publishing_service_1.MetaPublishingService,
            meta_oauth_service_1.MetaOAuthService,
            meta_publishing_sync_service_1.MetaPublishingSyncService,
        ],
        exports: [meta_publishing_service_1.MetaPublishingService, meta_oauth_service_1.MetaOAuthService, meta_publishing_sync_service_1.MetaPublishingSyncService],
    })
], MetaPublishingModule);
//# sourceMappingURL=meta-publishing.module.js.map