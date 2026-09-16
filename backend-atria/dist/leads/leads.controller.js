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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const rbac_1 = require("../auth/utils/rbac");
const fetch_maps_leads_dto_1 = require("./dto/fetch-maps-leads.dto");
const lead_comment_dto_1 = require("./dto/lead-comment.dto");
const lead_kanban_dto_1 = require("./dto/lead-kanban.dto");
const prospecting_leads_query_dto_1 = require("../crm/dto/prospecting-leads-query.dto");
const cnae_resolver_service_1 = require("./company-lookup/application/cnae-resolver.service");
const b2b_lead_search_dto_1 = require("./company-lookup/dto/b2b-lead-search.dto");
const cnae_search_query_dto_1 = require("./company-lookup/dto/cnae-search-query.dto");
const lead_search_session_service_1 = require("./company-lookup/application/lead-search-session.service");
const lead_search_dto_1 = require("./dto/lead-search.dto");
const leads_service_1 = require("./leads.service");
let LeadsController = class LeadsController {
    leadsService;
    leadSearchSessionService;
    cnaeResolverService;
    constructor(leadsService, leadSearchSessionService, cnaeResolverService) {
        this.leadsService = leadsService;
        this.leadSearchSessionService = leadSearchSessionService;
        this.cnaeResolverService = cnaeResolverService;
    }
    findAll(user) {
        return this.leadsService.findAll(user);
    }
    getKanbanBoard(user, query) {
        return this.leadsService.findKanbanBoard(user, query.organizationId);
    }
    searchCnae(query) {
        return this.cnaeResolverService.search(query.q ?? '');
    }
    listSearchSessions(user) {
        return this.leadSearchSessionService.listSessions(user.companyId);
    }
    getSearchSessionLeads(user, id) {
        return this.leadSearchSessionService.getSessionLeads(user.companyId, id);
    }
    search(user, dto) {
        return this.leadSearchSessionService.search(user.companyId, dto);
    }
    searchScraper(dto) {
        return this.leadsService.search(dto);
    }
    fetchMaps(dto) {
        return this.leadsService.fetchMaps(dto);
    }
    addToKanban(user, dto) {
        return this.leadsService.addToKanban(user, dto);
    }
    removeFromKanban(user, id) {
        return this.leadsService.removeFromKanban(user, id);
    }
    getComments(user, id) {
        return this.leadsService.getComments(user, id);
    }
    createComment(user, id, dto) {
        return this.leadsService.createComment(user, user.userId, id, dto.content);
    }
    updateStatus(user, id, dto) {
        return this.leadsService.updateStatus(user, id, dto);
    }
    qualify(user, id) {
        return this.leadsService.qualify(user, id);
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('kanban'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, prospecting_leads_query_dto_1.ProspectingLeadsQueryDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "getKanbanBoard", null);
__decorate([
    (0, common_1.Get)('cnae/search'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cnae_search_query_dto_1.CnaeSearchQueryDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "searchCnae", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "listSearchSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "getSearchSessionLeads", null);
__decorate([
    (0, common_1.Post)('search'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, b2b_lead_search_dto_1.B2bLeadSearchDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('search/scraper'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lead_search_dto_1.LeadSearchDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "searchScraper", null);
__decorate([
    (0, common_1.Post)('fetch-maps'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fetch_maps_leads_dto_1.FetchMapsLeadsDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "fetchMaps", null);
__decorate([
    (0, common_1.Post)('kanban'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, lead_kanban_dto_1.AddLeadToKanbanDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "addToKanban", null);
__decorate([
    (0, common_1.Delete)(':id/kanban'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "removeFromKanban", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, lead_comment_dto_1.CreateLeadCommentDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "createComment", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, lead_kanban_dto_1.UpdateLeadStatusDto]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/qualify'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "qualify", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCrmPermissions)()),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        lead_search_session_service_1.LeadSearchSessionService,
        cnae_resolver_service_1.CnaeResolverService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map