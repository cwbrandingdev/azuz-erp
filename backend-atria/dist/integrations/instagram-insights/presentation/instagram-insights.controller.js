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
exports.InstagramInsightsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../../auth/decorators/roles.decorator");
const roles_1 = require("../../../auth/constants/roles");
const instagram_insights_service_1 = require("../application/instagram-insights.service");
const query_instagram_insights_dto_1 = require("./dto/query-instagram-insights.dto");
const query_instagram_period_dto_1 = require("./dto/query-instagram-period.dto");
let InstagramInsightsController = class InstagramInsightsController {
    insights;
    constructor(insights) {
        this.insights = insights;
    }
    listConversations(query) {
        return this.insights.listConversations({
            month: query.month,
            year: query.year,
        });
    }
    listClients() {
        return this.insights.listClients();
    }
    getClientMetrics(clientId, query) {
        return this.insights.getClientMetrics(clientId, {
            contentType: query.contentType,
            month: query.month,
            year: query.year,
        });
    }
};
exports.InstagramInsightsController = InstagramInsightsController;
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_instagram_period_dto_1.QueryInstagramPeriodDto]),
    __metadata("design:returntype", void 0)
], InstagramInsightsController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)('clients'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InstagramInsightsController.prototype, "listClients", null);
__decorate([
    (0, common_1.Get)('clients/:clientId'),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_instagram_insights_dto_1.QueryInstagramInsightsDto]),
    __metadata("design:returntype", void 0)
], InstagramInsightsController.prototype, "getClientMetrics", null);
exports.InstagramInsightsController = InstagramInsightsController = __decorate([
    (0, common_1.Controller)('instagram-insights'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_LOOKUP_ROLES),
    __metadata("design:paramtypes", [instagram_insights_service_1.InstagramInsightsService])
], InstagramInsightsController);
//# sourceMappingURL=instagram-insights.controller.js.map