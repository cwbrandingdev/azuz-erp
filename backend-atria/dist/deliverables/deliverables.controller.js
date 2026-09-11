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
exports.DeliverablesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_1 = require("../auth/constants/roles");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_review_dto_1 = require("./dto/client-review.dto");
const revision_item_dto_1 = require("./dto/revision-item.dto");
const deliverables_service_1 = require("./deliverables.service");
const DELIVERABLE_SUBMISSION_ROLES = [
    client_1.RoleName.MASTER,
    client_1.RoleName.ADMIN,
    client_1.RoleName.DESIGNER_MASTER,
    client_1.RoleName.DESIGNER_JUNIOR,
];
let DeliverablesController = class DeliverablesController {
    deliverablesService;
    constructor(deliverablesService) {
        this.deliverablesService = deliverablesService;
    }
    reviseItemPost(itemId, dto, user) {
        return this.reviseItem(itemId, dto, user);
    }
    reviseItem(itemId, dto, user) {
        return this.deliverablesService.reviseItem(itemId, dto, user.userId);
    }
    async downloadItem(itemId, res) {
        const payload = await this.deliverablesService.getDownload(itemId);
        if (payload.source === 'local' &&
            'streamPath' in payload &&
            payload.streamPath) {
            res.setHeader('Content-Disposition', payload.contentDisposition);
            res.setHeader('Content-Type', 'application/octet-stream');
            return new common_1.StreamableFile(this.deliverablesService.openLocalFileStream(payload.streamPath));
        }
        return {
            itemId: payload.itemId,
            fileName: payload.fileName,
            mediaType: payload.mediaType,
            downloadUrl: payload.downloadUrl,
            expiresAt: payload.expiresAt,
            contentDisposition: payload.contentDisposition,
            source: payload.source,
        };
    }
    submit(id, user, file, caption) {
        return this.deliverablesService.submit(id, user.userId, user.role, file, caption);
    }
    approveInternal(id, user) {
        return this.deliverablesService.approveInternal(id, user.userId, user.role);
    }
    rejectClient(id, dto, user) {
        return this.deliverablesService.rejectClient(id, dto, user.userId);
    }
    approveClient(id, user) {
        return this.deliverablesService.approveClient(id, user.userId);
    }
    getFullView(id) {
        return this.deliverablesService.getFullView(id);
    }
};
exports.DeliverablesController = DeliverablesController;
__decorate([
    (0, common_1.Post)('items/:itemId/revision'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_item_dto_1.RevisionDeliverableItemDto, Object]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "reviseItemPost", null);
__decorate([
    (0, common_1.Patch)('items/:itemId/revision'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_item_dto_1.RevisionDeliverableItemDto, Object]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "reviseItem", null);
__decorate([
    (0, common_1.Get)('items/:itemId/download'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeliverablesController.prototype, "downloadItem", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, roles_decorator_1.Roles)(...DELIVERABLE_SUBMISSION_ROLES),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, (0, path_1.join)(process.cwd(), 'uploads'));
            },
            filename: (_req, file, cb) => {
                cb(null, `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: { fileSize: 100 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('caption')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/approve-internal'),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "approveInternal", null);
__decorate([
    (0, common_1.Post)(':id/reject-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_review_dto_1.RejectClientDeliverableDto, Object]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "rejectClient", null);
__decorate([
    (0, common_1.Post)(':id/approve-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "approveClient", null);
__decorate([
    (0, common_1.Get)(':id/full-view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeliverablesController.prototype, "getFullView", null);
exports.DeliverablesController = DeliverablesController = __decorate([
    (0, common_1.Controller)('deliverables'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.DELIVERABLE_ACCESS_ROLES),
    __metadata("design:paramtypes", [deliverables_service_1.DeliverablesService])
], DeliverablesController);
//# sourceMappingURL=deliverables.controller.js.map