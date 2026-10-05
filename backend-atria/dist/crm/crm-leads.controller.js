"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmLeadsController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const leads_service_1 = require("../leads/leads.service");
const create_crm_lead_dto_1 = require("./dto/create-crm-lead.dto");
const update_crm_lead_dto_1 = require("./dto/update-crm-lead.dto");
const prospecting_leads_query_dto_1 = require("./dto/prospecting-leads-query.dto");
const toggle_lead_collapse_dto_1 = require("./dto/toggle-lead-collapse.dto");
const lead_kanban_dto_1 = require("../leads/dto/lead-kanban.dto");
let CrmLeadsController = class CrmLeadsController {
    leadsService;
    constructor(leadsService) {
        this.leadsService = leadsService;
    }
    findAll(user) {
        return this.leadsService.findAllForCrm(user);
    }
    findProspectingLeads(user, query) {
        return this.leadsService.findProspectingLeads(user, query.organizationId);
    }
    getKanbanBoard(user, query) {
        return this.leadsService.findKanbanBoard(user, query.organizationId);
    }
    create(user, dto) {
        return this.leadsService.createForCrm(user, dto);
    }
    updateStage(user, id, dto) {
        return this.leadsService.updateLeadStage(user, id, dto);
    }
    toggleCollapse(user, id, dto) {
        return this.leadsService.toggleLeadCollapse(user, id, dto.isMinimized);
    }
    update(user, id, dto) {
        return this.leadsService.updateForCrm(user, id, dto);
    }
};
exports.CrmLeadsController = CrmLeadsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('prospecting-leads'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, prospecting_leads_query_dto_1.ProspectingLeadsQueryDto]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "findProspectingLeads", null);
__decorate([
    (0, common_1.Get)('kanban'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, prospecting_leads_query_dto_1.ProspectingLeadsQueryDto]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "getKanbanBoard", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_crm_lead_dto_1.CreateCrmLeadDto]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/stage'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, lead_kanban_dto_1.UpdateLeadStatusDto]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "updateStage", null);
__decorate([
    (0, common_1.Patch)(':id/collapse'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, toggle_lead_collapse_dto_1.ToggleLeadCollapseDto]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "toggleCollapse", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_crm_lead_dto_1.UpdateCrmLeadDto]),
    __metadata("design:returntype", void 0)
], CrmLeadsController.prototype, "update", null);
exports.CrmLeadsController = CrmLeadsController = __decorate([
    (0, common_1.Controller)('crm/leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCrmPermissions)()),
    __metadata("design:paramtypes", [leads_service_1.LeadsService])
], CrmLeadsController);
//# sourceMappingURL=crm-leads.controller.js.map