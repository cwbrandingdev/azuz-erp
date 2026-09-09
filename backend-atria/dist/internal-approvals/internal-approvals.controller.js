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
exports.InternalApprovalsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const approve_internal_approval_dto_1 = require("./dto/approve-internal-approval.dto");
const request_adjustment_dto_1 = require("./dto/request-adjustment.dto");
const internal_approvals_service_1 = require("./internal-approvals.service");
let InternalApprovalsController = class InternalApprovalsController {
    internalApprovalsService;
    constructor(internalApprovalsService) {
        this.internalApprovalsService = internalApprovalsService;
    }
    listPending(user) {
        return this.internalApprovalsService.listPending(user.role);
    }
    approve(id, user, dto = {}) {
        return this.internalApprovalsService.approve(id, user.userId, user.role, dto);
    }
    submitDelivery(id, user, file, caption) {
        return this.internalApprovalsService.submitDelivery(id, user.userId, user.role, file, caption);
    }
    requestAdjustment(id, user, dto) {
        return this.internalApprovalsService.requestAdjustment(id, user.userId, user.role, dto);
    }
};
exports.InternalApprovalsController = InternalApprovalsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InternalApprovalsController.prototype, "listPending", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, approve_internal_approval_dto_1.ApproveInternalApprovalDto]),
    __metadata("design:returntype", void 0)
], InternalApprovalsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/submit-delivery'),
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
], InternalApprovalsController.prototype, "submitDelivery", null);
__decorate([
    (0, common_1.Post)(':id/request-adjustment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, request_adjustment_dto_1.RequestAdjustmentDto]),
    __metadata("design:returntype", void 0)
], InternalApprovalsController.prototype, "requestAdjustment", null);
exports.InternalApprovalsController = InternalApprovalsController = __decorate([
    (0, common_1.Controller)('internal-approvals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.DESIGNER_MASTER),
    __metadata("design:paramtypes", [internal_approvals_service_1.InternalApprovalsService])
], InternalApprovalsController);
//# sourceMappingURL=internal-approvals.controller.js.map