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
exports.JhonatanCalendarController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const jhonatan_calendar_dto_1 = require("./dto/jhonatan-calendar.dto");
const jhonatan_calendar_service_1 = require("./jhonatan-calendar.service");
let JhonatanCalendarController = class JhonatanCalendarController {
    jhonatanCalendarService;
    constructor(jhonatanCalendarService) {
        this.jhonatanCalendarService = jhonatanCalendarService;
    }
    findAll(user, query) {
        return this.jhonatanCalendarService.findAll(user, query);
    }
    create(user, dto) {
        return this.jhonatanCalendarService.create(user, dto);
    }
    remove(user, id) {
        return this.jhonatanCalendarService.remove(user, id);
    }
};
exports.JhonatanCalendarController = JhonatanCalendarController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, jhonatan_calendar_dto_1.QueryJhonatanCalendarDto]),
    __metadata("design:returntype", void 0)
], JhonatanCalendarController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, jhonatan_calendar_dto_1.CreateJhonatanCalendarDto]),
    __metadata("design:returntype", void 0)
], JhonatanCalendarController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], JhonatanCalendarController.prototype, "remove", null);
exports.JhonatanCalendarController = JhonatanCalendarController = __decorate([
    (0, common_1.Controller)('jhonatan-calendar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCrmPermissions)()),
    __metadata("design:paramtypes", [jhonatan_calendar_service_1.JhonatanCalendarService])
], JhonatanCalendarController);
//# sourceMappingURL=jhonatan-calendar.controller.js.map