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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const allow_authenticated_decorator_1 = require("../auth/decorators/allow-authenticated.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const permissions_1 = require("../auth/constants/permissions");
const roles_1 = require("../auth/constants/roles");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const user_dto_1 = require("./dto/user.dto");
const users_service_1 = require("./users.service");
const ALLOWED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
]);
const MEMBER_ROLES = [...roles_1.INTERNAL_STAFF_ROLES];
const avatarUploadInterceptor = (0, platform_express_1.FileInterceptor)('file', {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
            cb(new common_1.BadRequestException('Tipo de imagem inválido. Use PNG, JPG ou WEBP.'), false);
            return;
        }
        cb(null, true);
    },
});
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    findAll() {
        return this.usersService.findAll();
    }
    findMembers() {
        return this.usersService.findMembers();
    }
    findClients() {
        return this.usersService.findClients();
    }
    findRepresentatives() {
        return this.usersService.findRepresentatives();
    }
    provision(user, dto) {
        return this.usersService.provision(dto, user.userId);
    }
    async uploadMyAvatar(user, file) {
        if (!file) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        return this.usersService.uploadAvatar(user.userId, file);
    }
    removeMyAvatar(user) {
        return this.usersService.removeAvatar(user.userId);
    }
    async uploadUserAvatar(id, file) {
        if (!file) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        return this.usersService.uploadAvatar(id, file);
    }
    deactivate(id) {
        return this.usersService.deactivate(id);
    }
    update(id, dto) {
        return this.usersService.update(id, dto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.USERS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('members'),
    (0, roles_decorator_1.Roles)(...MEMBER_ROLES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findMembers", null);
__decorate([
    (0, common_1.Get)('clients'),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_DIRECTORY_ROLES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findClients", null);
__decorate([
    (0, common_1.Get)('representatives'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findRepresentatives", null);
__decorate([
    (0, common_1.Post)('provision'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.USERS_MANAGE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.ProvisionUserDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "provision", null);
__decorate([
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    (0, common_1.Post)('me/avatar'),
    (0, common_1.UseInterceptors)(avatarUploadInterceptor),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadMyAvatar", null);
__decorate([
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    (0, common_1.Post)('me/avatar/remove'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeMyAvatar", null);
__decorate([
    (0, common_1.Post)(':id/avatar'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.USERS_MANAGE),
    (0, common_1.UseInterceptors)(avatarUploadInterceptor),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadUserAvatar", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.USERS_DEACTIVATE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.USERS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map