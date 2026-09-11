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
exports.SuggestionsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const allow_authenticated_decorator_1 = require("../auth/decorators/allow-authenticated.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const suggestion_dto_1 = require("./dto/suggestion.dto");
const suggestions_service_1 = require("./suggestions.service");
let SuggestionsController = class SuggestionsController {
    suggestionsService;
    constructor(suggestionsService) {
        this.suggestionsService = suggestionsService;
    }
    create(user, dto) {
        return this.suggestionsService.create(user.userId, user.companyId, dto);
    }
    findMine(user) {
        return this.suggestionsService.findMine(user.userId, user.companyId);
    }
    findAll(user) {
        return this.suggestionsService.findAll(user.companyId);
    }
    updateStatus(id, user, dto) {
        return this.suggestionsService.updateStatus(id, user.role, user.companyId, dto);
    }
};
exports.SuggestionsController = SuggestionsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, suggestion_dto_1.CreateSuggestionDto]),
    __metadata("design:returntype", void 0)
], SuggestionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuggestionsController.prototype, "findMine", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuggestionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, suggestion_dto_1.UpdateSuggestionStatusDto]),
    __metadata("design:returntype", void 0)
], SuggestionsController.prototype, "updateStatus", null);
exports.SuggestionsController = SuggestionsController = __decorate([
    (0, common_1.Controller)('suggestions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    __metadata("design:paramtypes", [suggestions_service_1.SuggestionsService])
], SuggestionsController);
//# sourceMappingURL=suggestions.controller.js.map