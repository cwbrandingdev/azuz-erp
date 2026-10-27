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
exports.LeadMinerController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const import_leads_dto_1 = require("./dto/import-leads.dto");
const search_leads_dto_1 = require("./dto/search-leads.dto");
const leadminer_service_1 = require("./leadminer.service");
let LeadMinerController = class LeadMinerController {
    leadMinerService;
    constructor(leadMinerService) {
        this.leadMinerService = leadMinerService;
    }
    async searchLeads(dto) {
        return await this.leadMinerService.SearchLeads(dto);
    }
    async getJobStatus(jobId) {
        return await this.leadMinerService.getJobStatus(jobId);
    }
    async importLeads(dto) {
        return await this.leadMinerService.importLeads(dto);
    }
};
exports.LeadMinerController = LeadMinerController;
__decorate([
    (0, common_1.Post)('search'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_leads_dto_1.SearchLeadsDto]),
    __metadata("design:returntype", Promise)
], LeadMinerController.prototype, "searchLeads", null);
__decorate([
    (0, common_1.Get)('job/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeadMinerController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Post)('import'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [import_leads_dto_1.ImportLeadMinerLeadsDto]),
    __metadata("design:returntype", Promise)
], LeadMinerController.prototype, "importLeads", null);
exports.LeadMinerController = LeadMinerController = __decorate([
    (0, common_1.Controller)('leadminer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCrmPermissions)()),
    __metadata("design:paramtypes", [leadminer_service_1.LeadminerService])
], LeadMinerController);
//# sourceMappingURL=leadminer.controller.js.map