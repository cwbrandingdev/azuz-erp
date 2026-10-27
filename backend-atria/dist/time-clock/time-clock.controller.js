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
exports.TimeClockController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const allow_authenticated_decorator_1 = require("../auth/decorators/allow-authenticated.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const time_clock_dto_1 = require("./dto/time-clock.dto");
const punch_context_1 = require("./punch-context");
const time_clock_service_1 = require("./time-clock.service");
let TimeClockController = class TimeClockController {
    timeClockService;
    constructor(timeClockService) {
        this.timeClockService = timeClockService;
    }
    punch(user, dto, request) {
        return this.timeClockService.punch(user, dto.type, (0, punch_context_1.extractPunchContext)(request));
    }
    getMine(user, query) {
        return this.timeClockService.getMine(user, query);
    }
    list(user, query) {
        return this.timeClockService.list(user, query);
    }
    createManual(user, dto) {
        return this.timeClockService.createManual(user, dto);
    }
    update(user, id, dto) {
        return this.timeClockService.update(user, id, dto);
    }
};
exports.TimeClockController = TimeClockController;
__decorate([
    (0, common_1.Post)('punch'),
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, time_clock_dto_1.PunchTimeClockDto, Object]),
    __metadata("design:returntype", void 0)
], TimeClockController.prototype, "punch", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, time_clock_dto_1.TimeClockRangeQueryDto]),
    __metadata("design:returntype", void 0)
], TimeClockController.prototype, "getMine", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.ADMIN, client_1.RoleName.MANAGER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, time_clock_dto_1.TimeClockListQueryDto]),
    __metadata("design:returntype", void 0)
], TimeClockController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('entries'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.ADMIN, client_1.RoleName.MANAGER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, time_clock_dto_1.CreateManualTimeClockEntryDto]),
    __metadata("design:returntype", void 0)
], TimeClockController.prototype, "createManual", null);
__decorate([
    (0, common_1.Patch)('entries/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.ADMIN, client_1.RoleName.MANAGER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, time_clock_dto_1.UpdateTimeClockEntryDto]),
    __metadata("design:returntype", void 0)
], TimeClockController.prototype, "update", null);
exports.TimeClockController = TimeClockController = __decorate([
    (0, common_1.Controller)('time-clock'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [time_clock_service_1.TimeClockService])
], TimeClockController);
//# sourceMappingURL=time-clock.controller.js.map