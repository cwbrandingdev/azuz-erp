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
exports.UserGroupsController = void 0;
const common_1 = require("@nestjs/common");
const roles_1 = require("../auth/constants/roles");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const user_dto_1 = require("../users/dto/user.dto");
const user_groups_service_1 = require("./user-groups.service");
const MEMBER_ROLES = [...roles_1.INTERNAL_STAFF_ROLES];
let UserGroupsController = class UserGroupsController {
    userGroupsService;
    constructor(userGroupsService) {
        this.userGroupsService = userGroupsService;
    }
    findAll() {
        return this.userGroupsService.findAll();
    }
    findOne(id) {
        return this.userGroupsService.findOne(id);
    }
    create(dto) {
        return this.userGroupsService.create(dto);
    }
    update(id, dto) {
        return this.userGroupsService.update(id, dto);
    }
    addMembers(id, dto) {
        return this.userGroupsService.addMembers(id, dto.memberIds);
    }
    remove(id) {
        return this.userGroupsService.remove(id);
    }
};
exports.UserGroupsController = UserGroupsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserGroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CreateUserGroupDto]),
    __metadata("design:returntype", void 0)
], UserGroupsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateUserGroupDto]),
    __metadata("design:returntype", void 0)
], UserGroupsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/members'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.AddUserGroupMembersDto]),
    __metadata("design:returntype", void 0)
], UserGroupsController.prototype, "addMembers", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserGroupsController.prototype, "remove", null);
exports.UserGroupsController = UserGroupsController = __decorate([
    (0, common_1.Controller)('user-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...MEMBER_ROLES),
    __metadata("design:paramtypes", [user_groups_service_1.UserGroupsService])
], UserGroupsController);
//# sourceMappingURL=user-groups.controller.js.map