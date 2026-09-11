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
exports.PortalAuthRoutesController = exports.PortalSessionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const throttler_1 = require("@nestjs/throttler");
const throttle_1 = require("../auth/constants/throttle");
const roles_1 = require("../auth/constants/roles");
const portal_authenticated_decorator_1 = require("../auth/decorators/portal-authenticated.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_portal_financial_service_1 = require("../client-portal-financial/client-portal-financial.service");
const create_client_financial_attachment_dto_1 = require("../client-portal-financial/dto/create-client-financial-attachment.dto");
const assets_service_1 = require("../assets/assets.service");
const client_requests_service_1 = require("../client-requests/client-requests.service");
const client_request_dto_1 = require("../client-requests/dto/client-request.dto");
const deliverables_service_1 = require("../deliverables/deliverables.service");
const query_client_deliverables_dto_1 = require("../deliverables/dto/query-client-deliverables.dto");
const client_review_dto_1 = require("../deliverables/dto/client-review.dto");
const revision_item_dto_1 = require("../deliverables/dto/revision-item.dto");
const portal_dto_1 = require("./dto/portal.dto");
const portal_auth_dto_1 = require("./dto/portal-auth.dto");
const portal_auth_guard_1 = require("./guards/portal-auth.guard");
const portal_auth_service_1 = require("./portal-auth.service");
const portal_service_1 = require("./portal.service");
let PortalSessionController = class PortalSessionController {
    portalService;
    assetsService;
    clientRequestsService;
    deliverablesService;
    financialService;
    constructor(portalService, assetsService, clientRequestsService, deliverablesService, financialService) {
        this.portalService = portalService;
        this.assetsService = assetsService;
        this.clientRequestsService = clientRequestsService;
        this.deliverablesService = deliverablesService;
        this.financialService = financialService;
    }
    getPortalData(req) {
        return this.portalService.getPortalDataForClient(req.portalUser.clientId);
    }
    getFinances(req) {
        return this.portalService.getClientFinancesForClient(req.portalUser.clientId);
    }
    getCalendar(req, from, to) {
        return this.portalService.getClientPortalCalendar(req.portalUser.clientId, from, to);
    }
    getPortalReport(req, reportId) {
        return this.portalService.getPortalReportForClient(req.portalUser.clientId, reportId);
    }
    getPortalPost(req, postId) {
        return this.portalService.getPortalPostForClient(req.portalUser.clientId, postId);
    }
    approvePost(req, postId) {
        return this.portalService.approvePortalPostForClient(req.portalUser.clientId, postId);
    }
    rejectPost(req, postId, dto) {
        return this.portalService.rejectPortalPostForClient(req.portalUser.clientId, postId, dto);
    }
    getPortalContract(req, contractId) {
        return this.portalService.getPortalContractForClient(req.portalUser.clientId, contractId);
    }
    signContract(req, contractId) {
        return this.portalService.signPortalContractForClient(req.portalUser.clientId, contractId);
    }
    uploadAsset(req, fileType, file) {
        return this.portalService.uploadPortalAssetForClient(req.portalUser.clientId, file, fileType);
    }
    createBriefing(req, dto) {
        return this.portalService.createBriefingForClient(req.portalUser.clientId, dto);
    }
    listFinancialAttachments(req) {
        return this.financialService.listForClient(req.portalUser.clientId);
    }
    uploadFinancialAttachment(req, file, dto) {
        if (!file) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        return this.financialService.uploadForClient(req.portalUser.clientId, dto, file);
    }
    listRequests(req, query) {
        return this.clientRequestsService.findAllForClient(req.portalUser.clientId, query);
    }
    createRequest(req, dto) {
        return this.clientRequestsService.createForClient(req.portalUser.clientId, undefined, dto);
    }
    addRequestComment(req, id, dto) {
        return this.clientRequestsService.addComment(id, req.portalUser.id, dto, {
            clientId: req.portalUser.clientId,
            authorEmail: req.portalUser.email,
        });
    }
    listDeliverables(req, query) {
        return this.deliverablesService.findAllForClient(req.portalUser.clientId, query);
    }
    getDeliverableFullView(id) {
        return this.deliverablesService.getFullView(id);
    }
    approveDeliverable(id, req) {
        return this.deliverablesService.approveClient(id, req.portalUser.id);
    }
    rejectDeliverable(id, dto, req) {
        return this.deliverablesService.rejectClient(id, dto, req.portalUser.id);
    }
    reviseDeliverableItemPost(itemId, dto, req) {
        return this.reviseDeliverableItem(itemId, dto, req);
    }
    reviseDeliverableItem(itemId, dto, req) {
        return this.deliverablesService.reviseItem(itemId, dto, req.portalUser.id);
    }
};
exports.PortalSessionController = PortalSessionController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getPortalData", null);
__decorate([
    (0, common_1.Get)('finances'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getFinances", null);
__decorate([
    (0, common_1.Get)('calendar'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getCalendar", null);
__decorate([
    (0, common_1.Get)('reports/:reportId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('reportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getPortalReport", null);
__decorate([
    (0, common_1.Get)('posts/:postId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getPortalPost", null);
__decorate([
    (0, common_1.Patch)('posts/:postId/approve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "approvePost", null);
__decorate([
    (0, common_1.Patch)('posts/:postId/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, portal_dto_1.PortalRejectPostDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "rejectPost", null);
__decorate([
    (0, common_1.Get)('contracts/:contractId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('contractId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getPortalContract", null);
__decorate([
    (0, common_1.Patch)('contracts/:contractId/sign'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('contractId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "signContract", null);
__decorate([
    (0, common_1.Post)('assets/upload'),
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
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('fileType')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "uploadAsset", null);
__decorate([
    (0, common_1.Post)('briefings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, portal_dto_1.PortalBriefingDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "createBriefing", null);
__decorate([
    (0, common_1.Get)('financial/attachments'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "listFinancialAttachments", null);
__decorate([
    (0, common_1.Post)('financial/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 100 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, create_client_financial_attachment_dto_1.CreateClientFinancialAttachmentDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "uploadFinancialAttachment", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, client_request_dto_1.QueryClientRequestsDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, client_request_dto_1.CreateClientRequestDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Post)('requests/:id/comments'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, client_request_dto_1.CreateClientRequestCommentDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "addRequestComment", null);
__decorate([
    (0, common_1.Get)('deliverables'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_client_deliverables_dto_1.QueryClientDeliverablesDto]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "listDeliverables", null);
__decorate([
    (0, common_1.Get)('deliverables/:id/full-view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "getDeliverableFullView", null);
__decorate([
    (0, common_1.Post)('deliverables/:id/approve-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "approveDeliverable", null);
__decorate([
    (0, common_1.Post)('deliverables/:id/reject-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_review_dto_1.RejectClientDeliverableDto, Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "rejectDeliverable", null);
__decorate([
    (0, common_1.Post)('deliverables/items/:itemId/revision'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_item_dto_1.RevisionDeliverableItemDto, Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "reviseDeliverableItemPost", null);
__decorate([
    (0, common_1.Patch)('deliverables/items/:itemId/revision'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_item_dto_1.RevisionDeliverableItemDto, Object]),
    __metadata("design:returntype", void 0)
], PortalSessionController.prototype, "reviseDeliverableItem", null);
exports.PortalSessionController = PortalSessionController = __decorate([
    (0, common_1.Controller)('portal/session'),
    (0, common_1.UseGuards)(portal_auth_guard_1.PortalAuthGuard),
    (0, portal_authenticated_decorator_1.PortalAuthenticated)(),
    __metadata("design:paramtypes", [portal_service_1.PortalService,
        assets_service_1.AssetsService,
        client_requests_service_1.ClientRequestsService,
        deliverables_service_1.DeliverablesService,
        client_portal_financial_service_1.ClientPortalFinancialService])
], PortalSessionController);
let PortalAuthRoutesController = class PortalAuthRoutesController {
    portalAuthService;
    constructor(portalAuthService) {
        this.portalAuthService = portalAuthService;
    }
    login(dto) {
        return this.portalAuthService.login(dto);
    }
    refresh(body) {
        if (!body.refreshToken) {
            throw new common_1.BadRequestException('Refresh token required');
        }
        return this.portalAuthService.refresh(body.refreshToken);
    }
    logout(body) {
        if (body.refreshToken) {
            return this.portalAuthService.logout(body.refreshToken);
        }
        return { success: true };
    }
    provisionAccess(clientId, dto) {
        return this.portalAuthService.provisionPortalAccess(clientId, dto.password);
    }
};
exports.PortalAuthRoutesController = PortalAuthRoutesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)(throttle_1.AUTH_THROTTLE),
    (0, common_1.Post)('auth/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [portal_auth_dto_1.PortalLoginDto]),
    __metadata("design:returntype", void 0)
], PortalAuthRoutesController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)(throttle_1.AUTH_THROTTLE),
    (0, common_1.Post)('auth/refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthRoutesController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('auth/logout'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthRoutesController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('provision/:clientId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.USER_MANAGEMENT_ROLES),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, portal_auth_dto_1.ProvisionPortalAccessDto]),
    __metadata("design:returntype", void 0)
], PortalAuthRoutesController.prototype, "provisionAccess", null);
exports.PortalAuthRoutesController = PortalAuthRoutesController = __decorate([
    (0, common_1.Controller)('portal'),
    __metadata("design:paramtypes", [portal_auth_service_1.PortalAuthService])
], PortalAuthRoutesController);
//# sourceMappingURL=portal-session.controller.js.map