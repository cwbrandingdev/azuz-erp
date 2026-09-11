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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserGroupMembersDto = exports.UpdateUserDto = exports.ProvisionUserDto = exports.UpdateUserGroupDto = exports.CreateUserGroupDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const entity_id_1 = require("../../common/validation/entity-id");
class CreateUserGroupDto {
    name;
    description;
    color;
    memberIds;
}
exports.CreateUserGroupDto = CreateUserGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateUserGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateUserGroupDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsHexColor)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateUserGroupDto.prototype, "color", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], CreateUserGroupDto.prototype, "memberIds", void 0);
class UpdateUserGroupDto {
    name;
    description;
    color;
}
exports.UpdateUserGroupDto = UpdateUserGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateUserGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateUserGroupDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsHexColor)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserGroupDto.prototype, "color", void 0);
class ProvisionUserDto {
    name;
    role;
    userGroupId;
    userGroupIds;
    password;
    monthlySalary;
    emailDomain;
    clientId;
    email;
    avatarUrl;
    crmScopeClientIds;
    crmIncludeInternal;
}
exports.ProvisionUserDto = ProvisionUserDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RoleName),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "userGroupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], ProvisionUserDto.prototype, "userGroupIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProvisionUserDto.prototype, "monthlySalary", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "emailDomain", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.role === client_1.RoleName.CLIENT || o.role === client_1.RoleName.EXTERNAL_CLIENT_CRM),
    (0, entity_id_1.IsEntityId)(),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ProvisionUserDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.role === client_1.RoleName.CRM),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], ProvisionUserDto.prototype, "crmScopeClientIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.role === client_1.RoleName.CRM),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ProvisionUserDto.prototype, "crmIncludeInternal", void 0);
class UpdateUserDto {
    email;
    userGroupId;
    userGroupIds;
    role;
    monthlySalary;
    clientId;
    avatarUrl;
    crmScopeClientIds;
    crmIncludeInternal;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "userGroupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "userGroupIds", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RoleName),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "monthlySalary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.role === client_1.RoleName.CLIENT ||
        o.role === client_1.RoleName.EXTERNAL_CLIENT_CRM ||
        (o.clientId !== undefined && o.clientId !== null)),
    (0, entity_id_1.IsEntityId)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.role === client_1.RoleName.CRM),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "crmScopeClientIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.role === client_1.RoleName.CRM),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "crmIncludeInternal", void 0);
class AddUserGroupMembersDto {
    memberIds;
}
exports.AddUserGroupMembersDto = AddUserGroupMembersDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], AddUserGroupMembersDto.prototype, "memberIds", void 0);
//# sourceMappingURL=user.dto.js.map