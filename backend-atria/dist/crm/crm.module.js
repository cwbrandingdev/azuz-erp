"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmModule = void 0;
const common_1 = require("@nestjs/common");
const leads_module_1 = require("../leads/leads.module");
const crm_board_settings_controller_1 = require("./crm-board-settings.controller");
const crm_leads_controller_1 = require("./crm-leads.controller");
const crm_reminders_controller_1 = require("./crm-reminders.controller");
const crm_stages_controller_1 = require("./crm-stages.controller");
let CrmModule = class CrmModule {
};
exports.CrmModule = CrmModule;
exports.CrmModule = CrmModule = __decorate([
    (0, common_1.Module)({
        imports: [leads_module_1.LeadsModule],
        controllers: [
            crm_stages_controller_1.CrmStagesController,
            crm_board_settings_controller_1.CrmBoardSettingsController,
            crm_reminders_controller_1.CrmRemindersController,
            crm_leads_controller_1.CrmLeadsController,
        ],
    })
], CrmModule);
//# sourceMappingURL=crm.module.js.map