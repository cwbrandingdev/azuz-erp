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
exports.ClientsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_1 = require("../auth/constants/roles");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_requests_service_1 = require("../client-requests/client-requests.service");
const client_request_dto_1 = require("../client-requests/dto/client-request.dto");
const client_360_service_1 = require("./client-360.service");
const clients_service_1 = require("./clients.service");
const client_dto_1 = require("./dto/client.dto");
const bulk_import_dto_1 = require("./dto/bulk-import.dto");
const client_360_dto_1 = require("./dto/client-360.dto");
let ClientsController = class ClientsController {
    clientsService;
    client360Service;
    clientRequestsService;
    constructor(clientsService, client360Service, clientRequestsService) {
        this.clientsService = clientsService;
        this.client360Service = client360Service;
        this.clientRequestsService = clientRequestsService;
    }
    findAll(clientGroupId, activeOnly) {
        return this.clientsService.findAll(clientGroupId, activeOnly === 'true');
    }
    getClientRequests(id, query) {
        return this.clientRequestsService.findAll({ ...query, clientId: id });
    }
    getClient360(id, query) {
        return this.client360Service.getSection(id, query.section ?? client_360_dto_1.Client360Section.SUMMARY);
    }
    findOne(id) {
        return this.clientsService.findOne(id);
    }
    bulkImport(dto) {
        return this.clientsService.bulkImport(dto);
    }
    create(dto) {
        return this.clientsService.create(dto);
    }
    deactivate(id) {
        return this.clientsService.deactivate(id);
    }
    activate(id) {
        return this.clientsService.activate(id);
    }
    update(id, dto) {
        return this.clientsService.update(id, dto);
    }
    remove(id) {
        return this.clientsService.remove(id);
    }
};
exports.ClientsController = ClientsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_LOOKUP_ROLES),
    __param(0, (0, common_1.Query)('clientGroupId')),
    __param(1, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/requests'),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_VIEW_AND_CREATE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_request_dto_1.QueryClientRequestsDto]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "getClientRequests", null);
__decorate([
    (0, common_1.Get)(':id/360'),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_VIEW_AND_CREATE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_360_dto_1.QueryClient360Dto]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "getClient360", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_VIEW_AND_CREATE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_import_dto_1.BulkImportClientsDto]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "bulkImport", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_VIEW_AND_CREATE_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_dto_1.CreateClientDto]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_dto_1.UpdateClientDto]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientsController.prototype, "remove", null);
exports.ClientsController = ClientsController = __decorate([
    (0, common_1.Controller)('clients'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_DIRECTORY_ROLES),
    __metadata("design:paramtypes", [clients_service_1.ClientsService,
        client_360_service_1.Client360Service,
        client_requests_service_1.ClientRequestsService])
], ClientsController);
//# sourceMappingURL=clients.controller.js.map