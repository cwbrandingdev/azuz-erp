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
exports.ContentController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const content_service_1 = require("./content.service");
const content_post_dto_1 = require("./dto/content-post.dto");
const content_workflow_dto_1 = require("./dto/content-workflow.dto");
const internal_review_dto_1 = require("../kanban/dto/internal-review.dto");
let ContentController = class ContentController {
    contentService;
    constructor(contentService) {
        this.contentService = contentService;
    }
    getManagementBoard(clientId, status) {
        const parsedStatus = status
            ? status.toUpperCase()
            : undefined;
        return this.contentService.getManagementBoard(clientId, parsedStatus);
    }
    getOverview(clientId) {
        return this.contentService.getOverview(clientId);
    }
    getCalendar(from, to, clientId) {
        return this.contentService.getCalendarOverview(from, to, clientId);
    }
    getPosts(query) {
        return this.contentService.getPosts(query);
    }
    getPostInsights(id) {
        return this.contentService.getPostInsights(id);
    }
    getPostHistory(id) {
        return this.contentService.getPostHistory(id);
    }
    getPost(id) {
        return this.contentService.getPostById(id);
    }
    createPost(user, dto) {
        return this.contentService.createPost(user.userId, dto);
    }
    updatePost(id, dto) {
        return this.contentService.updatePost(id, dto);
    }
    createVersion(id, user, dto) {
        return this.contentService.createVersion(id, user.userId, dto);
    }
    approvePost(id) {
        return this.contentService.approvePost(id);
    }
    rejectPost(id, user, dto) {
        return this.contentService.rejectPost(id, user.userId, dto);
    }
    updateInternalReview(id, user, dto) {
        return this.contentService.updateInternalReview(id, user.userId, user.role, dto);
    }
    deletePost(id) {
        return this.contentService.deletePost(id);
    }
};
exports.ContentController = ContentController;
__decorate([
    (0, common_1.Get)('management'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getManagementBoard", null);
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, common_1.Query)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('calendar'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getCalendar", null);
__decorate([
    (0, common_1.Get)('posts'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [content_post_dto_1.QueryContentPostsDto]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getPosts", null);
__decorate([
    (0, common_1.Get)('posts/:id/insights'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getPostInsights", null);
__decorate([
    (0, common_1.Get)('posts/:id/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getPostHistory", null);
__decorate([
    (0, common_1.Get)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "getPost", null);
__decorate([
    (0, common_1.Post)('posts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, content_post_dto_1.CreateContentPostDto]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "createPost", null);
__decorate([
    (0, common_1.Patch)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, content_post_dto_1.UpdateContentPostDto]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Post)('posts/:id/versions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, content_workflow_dto_1.CreatePostVersionDto]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "createVersion", null);
__decorate([
    (0, common_1.Patch)('posts/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "approvePost", null);
__decorate([
    (0, common_1.Patch)('posts/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, content_workflow_dto_1.RejectContentPostDto]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "rejectPost", null);
__decorate([
    (0, common_1.Patch)('posts/:id/internal-review'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, internal_review_dto_1.InternalReviewDto]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "updateInternalReview", null);
__decorate([
    (0, common_1.Delete)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContentController.prototype, "deletePost", null);
exports.ContentController = ContentController = __decorate([
    (0, common_1.Controller)('content'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredKanbanEditPermissions)()),
    __metadata("design:paramtypes", [content_service_1.ContentService])
], ContentController);
//# sourceMappingURL=content.controller.js.map