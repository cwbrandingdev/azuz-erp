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
exports.SlaController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const sla_dto_1 = require("./dto/sla.dto");
const sla_service_1 = require("./sla.service");
let SlaController = class SlaController {
    slaService;
    constructor(slaService) {
        this.slaService = slaService;
    }
    getSettings() {
        return this.slaService.getSettings();
    }
    updateSettings(dto) {
        return this.slaService.updateSettings(dto);
    }
    getDashboard() {
        return this.slaService.getDashboard();
    }
    updateBrief(id, dto) {
        return this.slaService.updateBrief(id, dto);
    }
};
exports.SlaController = SlaController;
__decorate([
    (0, common_1.Get)('settings'),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SlaController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sla_dto_1.UpdateSlaSettingsDto]),
    __metadata("design:returntype", void 0)
], SlaController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SlaController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Patch)('briefs/:id'),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sla_dto_1.UpdateClientBriefSlaDto]),
    __metadata("design:returntype", void 0)
], SlaController.prototype, "updateBrief", null);
exports.SlaController = SlaController = __decorate([
    (0, common_1.Controller)('sla'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [sla_service_1.SlaService])
], SlaController);
//# sourceMappingURL=sla.controller.js.map