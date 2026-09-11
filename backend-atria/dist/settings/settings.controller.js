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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const allow_authenticated_decorator_1 = require("../auth/decorators/allow-authenticated.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const appearance_dto_1 = require("./dto/appearance.dto");
const branding_dto_1 = require("./dto/branding.dto");
const integrations_dto_1 = require("./dto/integrations.dto");
const settings_service_1 = require("./settings.service");
const ALLOWED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
]);
const brandingUploadInterceptor = (0, platform_express_1.FileInterceptor)('file', {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            cb(new common_1.BadRequestException('Invalid image type'), false);
            return;
        }
        cb(null, true);
    },
});
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    getBranding() {
        return this.settingsService.getBranding();
    }
    updateBranding(dto) {
        return this.settingsService.updateBranding(dto);
    }
    getIntegrations() {
        return this.settingsService.getIntegrations();
    }
    updateIntegrations(dto) {
        return this.settingsService.updateIntegrations(dto);
    }
    uploadBrandingAsset(type, file) {
        if (!type || !['logo', 'favicon'].includes(type)) {
            throw new common_1.BadRequestException('Query param type must be logo or favicon');
        }
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        return this.settingsService.uploadBrandingAsset(type, file);
    }
    getAppearance(user) {
        return this.settingsService.getAppearance(user.userId);
    }
    updateAppearance(user, dto) {
        return this.settingsService.updateAppearance(user.userId, dto);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('branding'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getBranding", null);
__decorate([
    (0, common_1.Patch)('branding'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [branding_dto_1.UpdateBrandingDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateBranding", null);
__decorate([
    (0, common_1.Get)('integrations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getIntegrations", null);
__decorate([
    (0, common_1.Patch)('integrations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [integrations_dto_1.UpdateIntegrationsDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateIntegrations", null);
__decorate([
    (0, common_1.Post)('branding/upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.SETTINGS_MANAGE),
    (0, common_1.UseInterceptors)(brandingUploadInterceptor),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "uploadBrandingAsset", null);
__decorate([
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    (0, common_1.Get)('appearance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getAppearance", null);
__decorate([
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    (0, common_1.Patch)('appearance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, appearance_dto_1.UpdateAppearanceDto]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "updateAppearance", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map