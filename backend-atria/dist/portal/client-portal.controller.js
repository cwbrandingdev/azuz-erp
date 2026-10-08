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
exports.ClientPortalController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const upload_limits_1 = require("../common/upload/upload-limits");
const validate_upload_file_size_pipe_1 = require("../common/upload/validate-upload-file-size.pipe");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_requests_service_1 = require("../client-requests/client-requests.service");
const client_request_dto_1 = require("../client-requests/dto/client-request.dto");
const deliverables_service_1 = require("../deliverables/deliverables.service");
const query_client_deliverables_dto_1 = require("../deliverables/dto/query-client-deliverables.dto");
const client_review_dto_1 = require("../deliverables/dto/client-review.dto");
const revision_item_dto_1 = require("../deliverables/dto/revision-item.dto");
const crm_scope_service_1 = require("../leads/crm-scope.service");
const lead_comment_dto_1 = require("../leads/dto/lead-comment.dto");
const lead_kanban_dto_1 = require("../leads/dto/lead-kanban.dto");
const leads_service_1 = require("../leads/leads.service");
const toggle_lead_collapse_dto_1 = require("../crm/dto/toggle-lead-collapse.dto");
const portal_dto_1 = require("./dto/portal.dto");
const portal_service_1 = require("./portal.service");
let ClientPortalController = class ClientPortalController {
    portalService;
    clientRequestsService;
    deliverablesService;
    leadsService;
    crmScope;
    constructor(portalService, clientRequestsService, deliverablesService, leadsService, crmScope) {
        this.portalService = portalService;
        this.clientRequestsService = clientRequestsService;
        this.deliverablesService = deliverablesService;
        this.leadsService = leadsService;
        this.crmScope = crmScope;
    }
    requireClientId(user) {
        if (!user.clientId) {
            throw new common_1.ForbiddenException('Usuário CLIENT sem empresa vinculada. Contate o administrador.');
        }
        return user.clientId;
    }
    async requireCrmEnabled(clientId) {
        await this.crmScope.assertOrganizationCrmEnabled(clientId);
    }
    async getCrmKanbanBoard(user) {
        const clientId = this.requireClientId(user);
        await this.requireCrmEnabled(clientId);
        return this.leadsService.findKanbanBoard(user, clientId);
    }
    async updateCrmLeadStage(user, id, dto) {
        const clientId = this.requireClientId(user);
        await this.requireCrmEnabled(clientId);
        return this.leadsService.updateLeadStage(user, id, dto);
    }
    async toggleCrmLeadCollapse(user, id, dto) {
        const clientId = this.requireClientId(user);
        await this.requireCrmEnabled(clientId);
        return this.leadsService.toggleLeadCollapse(user, id, dto.isMinimized);
    }
    async getCrmLeadComments(user, id) {
        const clientId = this.requireClientId(user);
        await this.requireCrmEnabled(clientId);
        return this.leadsService.getComments(user, id);
    }
    async createCrmLeadComment(user, id, dto) {
        const clientId = this.requireClientId(user);
        await this.requireCrmEnabled(clientId);
        return this.leadsService.createComment(user, user.userId, id, dto.content);
    }
    getPortalData(user) {
        return this.portalService.getPortalDataForClient(this.requireClientId(user));
    }
    getCalendar(user, from, to) {
        return this.portalService.getClientPortalCalendar(this.requireClientId(user), from, to);
    }
    getPortalReport(user, reportId) {
        return this.portalService.getPortalReportForClient(this.requireClientId(user), reportId);
    }
    getPortalPost(user, postId) {
        return this.portalService.getPortalPostForClient(this.requireClientId(user), postId);
    }
    approvePost(user, postId) {
        return this.portalService.approvePortalPostForClient(this.requireClientId(user), postId);
    }
    rejectPost(user, postId, dto) {
        return this.portalService.rejectPortalPostForClient(this.requireClientId(user), postId, dto);
    }
    getPortalContract(user, contractId) {
        return this.portalService.getPortalContractForClient(this.requireClientId(user), contractId);
    }
    signContract(user, contractId) {
        return this.portalService.signPortalContractForClient(this.requireClientId(user), contractId);
    }
    getFinances(user) {
        return this.portalService.getClientFinancesForClient(this.requireClientId(user));
    }
    listRequests(user, query) {
        return this.clientRequestsService.findAllForClient(this.requireClientId(user), query);
    }
    createRequest(user, dto) {
        return this.clientRequestsService.createForClient(this.requireClientId(user), user.companyId, dto);
    }
    addRequestComment(user, id, dto) {
        return this.clientRequestsService.addComment(id, user.userId, dto, {
            clientId: this.requireClientId(user),
            authorEmail: user.email,
        });
    }
    listDeliverables(user, query) {
        return this.deliverablesService.findAllForClient(this.requireClientId(user), query);
    }
    getDeliverableFullView(id) {
        return this.deliverablesService.getFullView(id);
    }
    approveDeliverable(id, user) {
        return this.deliverablesService.approveClient(id, user.userId);
    }
    rejectDeliverable(id, dto, user) {
        return this.deliverablesService.rejectClient(id, dto, user.userId);
    }
    reviseDeliverableItemPost(itemId, dto, user) {
        return this.reviseDeliverableItem(itemId, dto, user);
    }
    reviseDeliverableItem(itemId, dto, user) {
        return this.deliverablesService.reviseItem(itemId, dto, user.userId);
    }
    uploadAsset(user, fileType, file) {
        if (!file) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        return this.portalService.uploadPortalAssetForClient(this.requireClientId(user), file, fileType);
    }
    createBriefing(user, dto) {
        return this.portalService.createBriefingForClient(this.requireClientId(user), dto);
    }
};
exports.ClientPortalController = ClientPortalController;
__decorate([
    (0, common_1.Get)('crm/kanban'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "getCrmKanbanBoard", null);
__decorate([
    (0, common_1.Patch)('crm/leads/:id/stage'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, lead_kanban_dto_1.UpdateLeadStatusDto]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "updateCrmLeadStage", null);
__decorate([
    (0, common_1.Patch)('crm/leads/:id/collapse'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, toggle_lead_collapse_dto_1.ToggleLeadCollapseDto]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "toggleCrmLeadCollapse", null);
__decorate([
    (0, common_1.Get)('crm/leads/:id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "getCrmLeadComments", null);
__decorate([
    (0, common_1.Post)('crm/leads/:id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, lead_comment_dto_1.CreateLeadCommentDto]),
    __metadata("design:returntype", Promise)
], ClientPortalController.prototype, "createCrmLeadComment", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getPortalData", null);
__decorate([
    (0, common_1.Get)('calendar'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getCalendar", null);
__decorate([
    (0, common_1.Get)('reports/:reportId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('reportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getPortalReport", null);
__decorate([
    (0, common_1.Get)('posts/:postId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getPortalPost", null);
__decorate([
    (0, common_1.Patch)('posts/:postId/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "approvePost", null);
__decorate([
    (0, common_1.Patch)('posts/:postId/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('postId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, portal_dto_1.PortalRejectPostDto]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "rejectPost", null);
__decorate([
    (0, common_1.Get)('contracts/:contractId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('contractId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getPortalContract", null);
__decorate([
    (0, common_1.Patch)('contracts/:contractId/sign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('contractId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "signContract", null);
__decorate([
    (0, common_1.Get)('finances'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getFinances", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, client_request_dto_1.QueryClientRequestsDto]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, client_request_dto_1.CreateClientRequestDto]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Post)('requests/:id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, client_request_dto_1.CreateClientRequestCommentDto]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "addRequestComment", null);
__decorate([
    (0, common_1.Get)('deliverables'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_client_deliverables_dto_1.QueryClientDeliverablesDto]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "listDeliverables", null);
__decorate([
    (0, common_1.Get)('deliverables/:id/full-view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "getDeliverableFullView", null);
__decorate([
    (0, common_1.Post)('deliverables/:id/approve-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "approveDeliverable", null);
__decorate([
    (0, common_1.Post)('deliverables/:id/reject-client'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_review_dto_1.RejectClientDeliverableDto, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "rejectDeliverable", null);
__decorate([
    (0, common_1.Post)('deliverables/items/:itemId/revision'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_item_dto_1.RevisionDeliverableItemDto, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "reviseDeliverableItemPost", null);
__decorate([
    (0, common_1.Patch)('deliverables/items/:itemId/revision'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, revision_item_dto_1.RevisionDeliverableItemDto, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "reviseDeliverableItem", null);
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
        limits: { fileSize: upload_limits_1.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('fileType')),
    __param(2, (0, common_1.UploadedFile)(validate_upload_file_size_pipe_1.ValidateUploadFileSizePipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "uploadAsset", null);
__decorate([
    (0, common_1.Post)('briefings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, portal_dto_1.PortalBriefingDto]),
    __metadata("design:returntype", void 0)
], ClientPortalController.prototype, "createBriefing", null);
exports.ClientPortalController = ClientPortalController = __decorate([
    (0, common_1.Controller)('client-portal'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.CLIENT),
    __metadata("design:paramtypes", [portal_service_1.PortalService,
        client_requests_service_1.ClientRequestsService,
        deliverables_service_1.DeliverablesService,
        leads_service_1.LeadsService,
        crm_scope_service_1.CrmScopeService])
], ClientPortalController);
//# sourceMappingURL=client-portal.controller.js.map