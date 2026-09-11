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
exports.ClientGroupsController = void 0;
const common_1 = require("@nestjs/common");
const roles_1 = require("../auth/constants/roles");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_group_dto_1 = require("./dto/client-group.dto");
const bulk_import_dto_1 = require("./dto/bulk-import.dto");
const client_groups_service_1 = require("./client-groups.service");
let ClientGroupsController = class ClientGroupsController {
    clientGroupsService;
    constructor(clientGroupsService) {
        this.clientGroupsService = clientGroupsService;
    }
    findAll() {
        return this.clientGroupsService.findAll();
    }
    findOne(id) {
        return this.clientGroupsService.findOne(id);
    }
    bulkImport(dto) {
        return this.clientGroupsService.bulkImport(dto);
    }
    create(dto) {
        return this.clientGroupsService.create(dto);
    }
    update(id, dto) {
        return this.clientGroupsService.update(id, dto);
    }
    remove(id) {
        return this.clientGroupsService.remove(id);
    }
};
exports.ClientGroupsController = ClientGroupsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ClientGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientGroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_import_dto_1.BulkImportClientGroupsDto]),
    __metadata("design:returntype", void 0)
], ClientGroupsController.prototype, "bulkImport", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_group_dto_1.CreateClientGroupDto]),
    __metadata("design:returntype", void 0)
], ClientGroupsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_group_dto_1.UpdateClientGroupDto]),
    __metadata("design:returntype", void 0)
], ClientGroupsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientGroupsController.prototype, "remove", null);
exports.ClientGroupsController = ClientGroupsController = __decorate([
    (0, common_1.Controller)('client-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_DIRECTORY_ROLES),
    __metadata("design:paramtypes", [client_groups_service_1.ClientGroupsService])
], ClientGroupsController);
//# sourceMappingURL=client-groups.controller.js.map