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
exports.ClientRequestsController = void 0;
const common_1 = require("@nestjs/common");
const roles_1 = require("../auth/constants/roles");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_requests_service_1 = require("./client-requests.service");
const client_request_dto_1 = require("./dto/client-request.dto");
let ClientRequestsController = class ClientRequestsController {
    clientRequestsService;
    constructor(clientRequestsService) {
        this.clientRequestsService = clientRequestsService;
    }
    findAll(query) {
        return this.clientRequestsService.findAll(query);
    }
    findOne(id) {
        return this.clientRequestsService.findOne(id);
    }
    create(user, dto) {
        return this.clientRequestsService.create(dto, {
            companyId: user.companyId ?? undefined,
            authorId: user.userId,
        });
    }
    addComment(user, id, dto) {
        return this.clientRequestsService.addComment(id, user.userId, dto);
    }
    convertToTask(user, id, dto) {
        return this.clientRequestsService.convertToTask(id, user.userId, dto);
    }
    update(id, dto) {
        return this.clientRequestsService.update(id, dto);
    }
    remove(id) {
        return this.clientRequestsService.remove(id);
    }
};
exports.ClientRequestsController = ClientRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_request_dto_1.QueryClientRequestsDto]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, client_request_dto_1.CreateClientRequestDto]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, client_request_dto_1.CreateClientRequestCommentDto]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-task'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, client_request_dto_1.ConvertClientRequestToTaskDto]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "convertToTask", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_request_dto_1.UpdateClientRequestDto]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientRequestsController.prototype, "remove", null);
exports.ClientRequestsController = ClientRequestsController = __decorate([
    (0, common_1.Controller)('client-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_DIRECTORY_ROLES),
    __metadata("design:paramtypes", [client_requests_service_1.ClientRequestsService])
], ClientRequestsController);
//# sourceMappingURL=client-requests.controller.js.map