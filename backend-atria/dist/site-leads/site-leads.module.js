"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteLeadsModule = void 0;
const common_1 = require("@nestjs/common");
const site_leads_controller_1 = require("./site-leads.controller");
const site_leads_service_1 = require("./site-leads.service");
let SiteLeadsModule = class SiteLeadsModule {
};
exports.SiteLeadsModule = SiteLeadsModule;
exports.SiteLeadsModule = SiteLeadsModule = __decorate([
    (0, common_1.Module)({
        controllers: [site_leads_controller_1.SiteLeadsController],
        providers: [site_leads_service_1.SiteLeadsService],
    })
], SiteLeadsModule);
//# sourceMappingURL=site-leads.module.js.map