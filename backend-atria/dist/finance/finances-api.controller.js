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
exports.FinancesApiController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const query_finance_dto_1 = require("./dto/query-finance.dto");
const finance_service_1 = require("./finance.service");
let FinancesApiController = class FinancesApiController {
    financeService;
    constructor(financeService) {
        this.financeService = financeService;
    }
    getDueTodayAlerts(user) {
        return this.financeService.getDueTodayAlerts(user.userId);
    }
    getMonthlyCashflow(user, query) {
        return this.financeService.getMonthlyCashflow(user.userId, query);
    }
};
exports.FinancesApiController = FinancesApiController;
__decorate([
    (0, common_1.Get)('due-today-alerts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinancesApiController.prototype, "getDueTodayAlerts", null);
__decorate([
    (0, common_1.Get)('monthly-cashflow'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_finance_dto_1.QueryFinanceDto]),
    __metadata("design:returntype", void 0)
], FinancesApiController.prototype, "getMonthlyCashflow", null);
exports.FinancesApiController = FinancesApiController = __decorate([
    (0, common_1.Controller)('api/finances'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.FINANCE_ACCESS),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinancesApiController);
//# sourceMappingURL=finances-api.controller.js.map