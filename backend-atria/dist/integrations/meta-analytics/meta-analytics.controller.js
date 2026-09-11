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
exports.MetaAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const query_meta_analytics_dto_1 = require("./dto/query-meta-analytics.dto");
const meta_analytics_service_1 = require("./meta-analytics.service");
let MetaAnalyticsController = class MetaAnalyticsController {
    metaAnalyticsService;
    constructor(metaAnalyticsService) {
        this.metaAnalyticsService = metaAnalyticsService;
    }
    getAnalytics(query) {
        return this.metaAnalyticsService.getAnalytics({
            datePreset: query.datePreset ?? 'last_90d',
            month: query.month,
            year: query.year,
        }, query.clientId, query.adAccountId);
    }
    getAdAccounts(query) {
        return this.metaAnalyticsService.getAdAccounts(query.search);
    }
    getAgencyOverview(query) {
        return this.metaAnalyticsService.getAgencyOverview({
            datePreset: query.datePreset ?? 'last_90d',
            month: query.month,
            year: query.year,
        }, query.search);
    }
    getClientInsights(clientId, query) {
        const accountId = clientId?.trim() ||
            query.clientId?.trim() ||
            query.adAccountId?.trim() ||
            undefined;
        return this.metaAnalyticsService.getClientInsights(accountId, {
            datePreset: query.datePreset ?? 'last_90d',
            month: query.month,
            year: query.year,
        });
    }
    getClientCampaigns(clientId, query) {
        const accountId = clientId?.trim() ||
            query.clientId?.trim() ||
            query.adAccountId?.trim() ||
            undefined;
        return this.metaAnalyticsService.getCampaigns(accountId, {
            datePreset: query.datePreset ?? 'last_90d',
            month: query.month,
            year: query.year,
        });
    }
};
exports.MetaAnalyticsController = MetaAnalyticsController;
__decorate([
    (0, common_1.Get)('api/integrations/meta/analytics'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_meta_analytics_dto_1.QueryMetaAnalyticsDto]),
    __metadata("design:returntype", void 0)
], MetaAnalyticsController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('insights/clients'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_meta_analytics_dto_1.QueryMetaAnalyticsDto]),
    __metadata("design:returntype", void 0)
], MetaAnalyticsController.prototype, "getAdAccounts", null);
__decorate([
    (0, common_1.Get)('insights/agency'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_meta_analytics_dto_1.QueryMetaAnalyticsDto]),
    __metadata("design:returntype", void 0)
], MetaAnalyticsController.prototype, "getAgencyOverview", null);
__decorate([
    (0, common_1.Get)('insights/client/:clientId'),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_meta_analytics_dto_1.QueryMetaAnalyticsDto]),
    __metadata("design:returntype", void 0)
], MetaAnalyticsController.prototype, "getClientInsights", null);
__decorate([
    (0, common_1.Get)('insights/client/:clientId/campaigns'),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_meta_analytics_dto_1.QueryMetaAnalyticsDto]),
    __metadata("design:returntype", void 0)
], MetaAnalyticsController.prototype, "getClientCampaigns", null);
exports.MetaAnalyticsController = MetaAnalyticsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    __metadata("design:paramtypes", [meta_analytics_service_1.MetaAnalyticsService])
], MetaAnalyticsController);
//# sourceMappingURL=meta-analytics.controller.js.map