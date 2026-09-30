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
exports.CompanySettingsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const company_settings_service_1 = require("./company-settings.service");
const resolve_meta_page_access_token_dto_1 = require("./dto/resolve-meta-page-access-token.dto");
const update_company_integrations_dto_1 = require("./dto/update-company-integrations.dto");
const update_company_settings_dto_1 = require("./dto/update-company-settings.dto");
let CompanySettingsController = class CompanySettingsController {
    companySettingsService;
    constructor(companySettingsService) {
        this.companySettingsService = companySettingsService;
    }
    getSettings() {
        return this.companySettingsService.getSettings();
    }
    updateSettings(dto) {
        return this.companySettingsService.updateSettings(dto);
    }
    getIntegrations() {
        return this.companySettingsService.getIntegrations();
    }
    updateIntegrations(dto) {
        return this.companySettingsService.updateIntegrations(dto);
    }
    resolveMetaPageAccessToken(dto) {
        return this.companySettingsService.resolveMetaPageAccessToken(dto);
    }
};
exports.CompanySettingsController = CompanySettingsController;
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_company_settings_dto_1.UpdateCompanySettingsDto]),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('integrations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "getIntegrations", null);
__decorate([
    (0, common_1.Patch)('integrations'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_company_integrations_dto_1.UpdateCompanyIntegrationsDto]),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "updateIntegrations", null);
__decorate([
    (0, common_1.Post)('integrations/resolve-meta-page-token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [resolve_meta_page_access_token_dto_1.ResolveMetaPageAccessTokenDto]),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "resolveMetaPageAccessToken", null);
exports.CompanySettingsController = CompanySettingsController = __decorate([
    (0, common_1.Controller)('api/company'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], CompanySettingsController);
//# sourceMappingURL=company-settings.controller.js.map