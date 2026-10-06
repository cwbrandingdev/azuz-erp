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
exports.CrmBoardSettingsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const rbac_1 = require("../auth/utils/rbac");
const crm_scope_service_1 = require("../leads/crm-scope.service");
const leads_service_1 = require("../leads/leads.service");
const update_crm_board_settings_dto_1 = require("./dto/update-crm-board-settings.dto");
let CrmBoardSettingsController = class CrmBoardSettingsController {
    leadsService;
    crmScope;
    constructor(leadsService, crmScope) {
        this.leadsService = leadsService;
        this.crmScope = crmScope;
    }
    async get(user, query) {
        await this.assertOrganizationAccess(user, query.organizationId);
        return this.leadsService.getBoardSettings(user, query.organizationId);
    }
    async update(user, dto) {
        await this.assertOrganizationAccess(user, dto.organizationId);
        return this.leadsService.updateBoardSettings(user, dto);
    }
    async assertOrganizationAccess(user, organizationId) {
        if (!organizationId)
            return;
        await this.crmScope.assertUserCanManageOrganization(user, organizationId);
    }
};
exports.CrmBoardSettingsController = CrmBoardSettingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_crm_board_settings_dto_1.CrmBoardSettingsQueryDto]),
    __metadata("design:returntype", Promise)
], CrmBoardSettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_crm_board_settings_dto_1.UpdateCrmBoardSettingsDto]),
    __metadata("design:returntype", Promise)
], CrmBoardSettingsController.prototype, "update", null);
exports.CrmBoardSettingsController = CrmBoardSettingsController = __decorate([
    (0, common_1.Controller)('crm/board-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCrmPermissions)()),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        crm_scope_service_1.CrmScopeService])
], CrmBoardSettingsController);
//# sourceMappingURL=crm-board-settings.controller.js.map