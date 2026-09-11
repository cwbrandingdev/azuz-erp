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
exports.CreationController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const creation_service_1 = require("./creation.service");
const brief_to_content_dto_1 = require("./dto/brief-to-content.dto");
const deliverable_dto_1 = require("./dto/deliverable.dto");
const internal_review_dto_1 = require("../kanban/dto/internal-review.dto");
let CreationController = class CreationController {
    creationService;
    constructor(creationService) {
        this.creationService = creationService;
    }
    getCommandCenter() {
        return this.creationService.getCommandCenter();
    }
    getClientPipeline(query) {
        return this.creationService.getClientPipeline(query.clientId, query.from, query.to);
    }
    createDeliverable(user, dto) {
        return this.creationService.createDeliverable(user.userId, dto);
    }
    updatePipelineInternalReview(user, source, id, dto) {
        return this.creationService.updatePipelineInternalReview(user.userId, user.role, source, id, dto);
    }
    updateItemStatus(source, id, dto) {
        return this.creationService.updateItemStatus(source, id, dto.status);
    }
    generateFromBrief(dto) {
        return this.creationService.generateFromBrief(dto);
    }
    createFromBriefPlan(user, dto) {
        return this.creationService.createFromBriefPlan(user.userId, dto);
    }
};
exports.CreationController = CreationController;
__decorate([
    (0, common_1.Get)('command-center'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "getCommandCenter", null);
__decorate([
    (0, common_1.Get)('pipeline'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [deliverable_dto_1.QueryClientPipelineDto]),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "getClientPipeline", null);
__decorate([
    (0, common_1.Post)('deliverables'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, deliverable_dto_1.CreateDeliverableDto]),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "createDeliverable", null);
__decorate([
    (0, common_1.Patch)('pipeline/items/:source/:id/internal-review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('source')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, internal_review_dto_1.InternalReviewDto]),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "updatePipelineInternalReview", null);
__decorate([
    (0, common_1.Patch)('pipeline/items/:source/:id/status'),
    __param(0, (0, common_1.Param)('source')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, deliverable_dto_1.UpdateItemStatusDto]),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "updateItemStatus", null);
__decorate([
    (0, common_1.Post)('brief-to-content/generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [brief_to_content_dto_1.GenerateBriefPlanDto]),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "generateFromBrief", null);
__decorate([
    (0, common_1.Post)('brief-to-content/create'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, brief_to_content_dto_1.CreateBriefPlanDto]),
    __metadata("design:returntype", void 0)
], CreationController.prototype, "createFromBriefPlan", null);
exports.CreationController = CreationController = __decorate([
    (0, common_1.Controller)('creation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredKanbanEditPermissions)()),
    __metadata("design:paramtypes", [creation_service_1.CreationService])
], CreationController);
//# sourceMappingURL=creation.controller.js.map