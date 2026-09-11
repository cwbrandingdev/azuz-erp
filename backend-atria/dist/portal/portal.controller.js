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
exports.PortalController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const throttler_1 = require("@nestjs/throttler");
const throttle_1 = require("../auth/constants/throttle");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const assets_service_1 = require("../assets/assets.service");
const portal_dto_1 = require("./dto/portal.dto");
const portal_service_1 = require("./portal.service");
let PortalController = class PortalController {
    portalService;
    assetsService;
    constructor(portalService, assetsService) {
        this.portalService = portalService;
        this.assetsService = assetsService;
    }
    getPortalData(token) {
        return this.portalService.getPortalData(token);
    }
    getPortalFinances(token) {
        return this.portalService.getClientFinancesByToken(token);
    }
    getPortalReport(token, reportId) {
        return this.portalService.getPortalReport(token, reportId);
    }
    getPortalPost(token, postId) {
        return this.portalService.getPortalPost(token, postId);
    }
    approvePost(token, postId) {
        return this.portalService.approvePortalPost(token, postId);
    }
    rejectPost(token, postId, dto) {
        return this.portalService.rejectPortalPost(token, postId, dto);
    }
    getPortalContract(token, contractId) {
        return this.portalService.getPortalContract(token, contractId);
    }
    signContract(token, contractId) {
        return this.portalService.signPortalContract(token, contractId);
    }
    uploadAsset(token, fileType, file) {
        return this.portalService.uploadPortalAsset(token, file, fileType);
    }
    createBriefing(token, dto) {
        return this.portalService.createBriefing(token, dto);
    }
};
exports.PortalController = PortalController;
__decorate([
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPortalData", null);
__decorate([
    (0, common_1.Get)(':token/finances'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPortalFinances", null);
__decorate([
    (0, common_1.Get)(':token/reports/:reportId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('reportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPortalReport", null);
__decorate([
    (0, common_1.Get)(':token/posts/:postId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPortalPost", null);
__decorate([
    (0, common_1.Patch)(':token/posts/:postId/approve'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "approvePost", null);
__decorate([
    (0, common_1.Patch)(':token/posts/:postId/reject'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, portal_dto_1.PortalRejectPostDto]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "rejectPost", null);
__decorate([
    (0, common_1.Get)(':token/contracts/:contractId'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('contractId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPortalContract", null);
__decorate([
    (0, common_1.Patch)(':token/contracts/:contractId/sign'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('contractId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "signContract", null);
__decorate([
    (0, common_1.Post)(':token/assets/upload'),
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
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('fileType')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "uploadAsset", null);
__decorate([
    (0, common_1.Post)(':token/briefings'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, portal_dto_1.PortalBriefingDto]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "createBriefing", null);
exports.PortalController = PortalController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)(throttle_1.PUBLIC_THROTTLE),
    (0, common_1.Controller)('portal'),
    __metadata("design:paramtypes", [portal_service_1.PortalService,
        assets_service_1.AssetsService])
], PortalController);
//# sourceMappingURL=portal.controller.js.map