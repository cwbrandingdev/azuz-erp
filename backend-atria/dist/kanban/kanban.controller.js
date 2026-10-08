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
exports.KanbanController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const upload_limits_1 = require("../common/upload/upload-limits");
const validate_upload_file_size_pipe_1 = require("../common/upload/validate-upload-file-size.pipe");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_1 = require("../auth/constants/roles");
const rbac_1 = require("../auth/utils/rbac");
const comment_dto_1 = require("./dto/comment.dto");
const column_dto_1 = require("./dto/column.dto");
const internal_review_dto_1 = require("./dto/internal-review.dto");
const deletion_history_dto_1 = require("./dto/deletion-history.dto");
const task_dto_1 = require("./dto/task.dto");
const kanban_service_1 = require("./kanban.service");
let KanbanController = class KanbanController {
    kanbanService;
    constructor(kanbanService) {
        this.kanbanService = kanbanService;
    }
    getDeletionHistory(query) {
        return this.kanbanService.getDeletionHistory(query);
    }
    clearTasks(user) {
        return this.kanbanService.clearAllTasks(user.userId, user.role);
    }
    getColumns() {
        return this.kanbanService.getColumns();
    }
    createColumn(dto) {
        return this.kanbanService.createColumn(dto);
    }
    reorderColumns(dto) {
        return this.kanbanService.reorderColumns(dto);
    }
    updateColumn(id, dto) {
        return this.kanbanService.updateColumn(id, dto);
    }
    deleteColumn(id) {
        return this.kanbanService.deleteColumn(id);
    }
    getTasks(query) {
        return this.kanbanService.getTasks(query);
    }
    getTask(id) {
        return this.kanbanService.getTask(id);
    }
    createTask(user, dto) {
        return this.kanbanService.createTask(user.userId, dto);
    }
    assignTask(user, id, dto) {
        return this.kanbanService.updateTask(user.userId, user.role, id, dto);
    }
    updateTask(user, id, dto) {
        return this.kanbanService.updateTask(user.userId, user.role, id, dto);
    }
    updateTaskStatus(user, id, dto) {
        return this.kanbanService.updateTaskStatus(user.userId, user.role, id, dto);
    }
    moveTask(user, id, dto) {
        return this.kanbanService.moveTask(user.userId, user.role, id, dto);
    }
    updateInternalReview(user, id, dto) {
        return this.kanbanService.updateInternalReview(user.userId, user.role, id, dto);
    }
    uploadTaskAsset(user, id, file, caption) {
        return this.kanbanService.uploadTaskAsset(user.userId, user.role, id, file, caption);
    }
    bulkDeleteTaskAssets(user, id, dto) {
        return this.kanbanService.bulkDeleteTaskAssets(user.userId, user.role, id, dto.assetIds);
    }
    deleteTaskAsset(user, id, assetId) {
        return this.kanbanService.deleteTaskAsset(user.userId, user.role, id, assetId);
    }
    deleteTask(user, id) {
        return this.kanbanService.deleteTask(user.userId, user.role, id);
    }
    getComments(id) {
        return this.kanbanService.getComments(id);
    }
    createComment(user, id, dto) {
        return this.kanbanService.createComment(user.userId, id, dto);
    }
    getHistory(id) {
        return this.kanbanService.getHistory(id);
    }
};
exports.KanbanController = KanbanController;
__decorate([
    (0, common_1.Get)('deletion-history'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [deletion_history_dto_1.QueryDeletionHistoryDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "getDeletionHistory", null);
__decorate([
    (0, common_1.Delete)('tasks/clear'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "clearTasks", null);
__decorate([
    (0, common_1.Get)('columns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "getColumns", null);
__decorate([
    (0, common_1.Post)('columns'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [column_dto_1.CreateColumnDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "createColumn", null);
__decorate([
    (0, common_1.Patch)('columns/reorder'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [column_dto_1.ReorderColumnsDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "reorderColumns", null);
__decorate([
    (0, common_1.Patch)('columns/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, column_dto_1.UpdateColumnDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "updateColumn", null);
__decorate([
    (0, common_1.Delete)('columns/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "deleteColumn", null);
__decorate([
    (0, common_1.Get)('tasks'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [task_dto_1.QueryTasksDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "getTasks", null);
__decorate([
    (0, common_1.Get)('tasks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "getTask", null);
__decorate([
    (0, common_1.Post)('tasks'),
    (0, roles_decorator_1.Roles)(...roles_1.KANBAN_TASK_CREATE_ROLES),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, task_dto_1.CreateTaskDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "createTask", null);
__decorate([
    (0, common_1.Patch)('tasks/:id/assign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_dto_1.UpdateTaskDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "assignTask", null);
__decorate([
    (0, common_1.Patch)('tasks/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_dto_1.UpdateTaskDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "updateTask", null);
__decorate([
    (0, common_1.Patch)('tasks/:id/status'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_dto_1.UpdateTaskStatusDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "updateTaskStatus", null);
__decorate([
    (0, common_1.Patch)('tasks/:id/move'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_dto_1.MoveTaskDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "moveTask", null);
__decorate([
    (0, common_1.Patch)('tasks/:id/internal-review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, internal_review_dto_1.InternalReviewDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "updateInternalReview", null);
__decorate([
    (0, common_1.Post)('tasks/:id/assets'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, (0, path_1.join)(process.cwd(), 'uploads'));
            },
            filename: (_req, file, cb) => {
                cb(null, `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: { fileSize: upload_limits_1.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)(validate_upload_file_size_pipe_1.ValidateUploadFileSizePipe)),
    __param(3, (0, common_1.Body)('caption')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "uploadTaskAsset", null);
__decorate([
    (0, common_1.Post)('tasks/:id/assets/bulk-delete'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, task_dto_1.BulkDeleteTaskAssetsDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "bulkDeleteTaskAssets", null);
__decorate([
    (0, common_1.Delete)('tasks/:id/assets/:assetId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('assetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "deleteTaskAsset", null);
__decorate([
    (0, common_1.Delete)('tasks/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "deleteTask", null);
__decorate([
    (0, common_1.Get)('tasks/:id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)('tasks/:id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, comment_dto_1.CreateCommentDto]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "createComment", null);
__decorate([
    (0, common_1.Get)('tasks/:id/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], KanbanController.prototype, "getHistory", null);
exports.KanbanController = KanbanController = __decorate([
    (0, common_1.Controller)('kanban'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredKanbanEditPermissions)()),
    __metadata("design:paramtypes", [kanban_service_1.KanbanService])
], KanbanController);
//# sourceMappingURL=kanban.controller.js.map