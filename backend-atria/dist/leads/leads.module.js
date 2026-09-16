"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsModule = void 0;
const common_1 = require("@nestjs/common");
const company_settings_module_1 = require("../company-settings/company-settings.module");
const notifications_module_1 = require("../notifications/notifications.module");
const company_lookup_module_1 = require("./company-lookup/company-lookup.module");
const maps_scraper_module_1 = require("./maps-scraper/maps-scraper.module");
const crm_scope_service_1 = require("./crm-scope.service");
const lead_notification_service_1 = require("./lead-notification.service");
const leads_controller_1 = require("./leads.controller");
const lead_stages_service_1 = require("./lead-stages.service");
const leads_service_1 = require("./leads.service");
let LeadsModule = class LeadsModule {
};
exports.LeadsModule = LeadsModule;
exports.LeadsModule = LeadsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            company_lookup_module_1.CompanyLookupModule,
            maps_scraper_module_1.MapsScraperModule,
            company_settings_module_1.CompanySettingsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [leads_controller_1.LeadsController],
        providers: [
            leads_service_1.LeadsService,
            lead_stages_service_1.LeadStagesService,
            crm_scope_service_1.CrmScopeService,
            lead_notification_service_1.LeadNotificationService,
        ],
        exports: [leads_service_1.LeadsService, lead_stages_service_1.LeadStagesService, crm_scope_service_1.CrmScopeService],
    })
], LeadsModule);
//# sourceMappingURL=leads.module.js.map