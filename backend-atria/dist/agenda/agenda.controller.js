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
exports.AgendaController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const agenda_service_1 = require("./agenda.service");
const agenda_event_dto_1 = require("./dto/agenda-event.dto");
let AgendaController = class AgendaController {
    agendaService;
    constructor(agendaService) {
        this.agendaService = agendaService;
    }
    findAll(query) {
        return this.agendaService.findAll(query);
    }
    findOne(id) {
        return this.agendaService.findOne(id);
    }
    create(user, dto) {
        return this.agendaService.create(user.userId, dto);
    }
    update(id, dto) {
        return this.agendaService.update(id, dto);
    }
    remove(id) {
        return this.agendaService.remove(id);
    }
    confirm(id, dto) {
        return this.agendaService.confirm(id, dto);
    }
    removeConfirmation(id, userId) {
        return this.agendaService.removeConfirmation(id, userId);
    }
};
exports.AgendaController = AgendaController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [agenda_event_dto_1.QueryAgendaEventsDto]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, agenda_event_dto_1.CreateAgendaEventDto]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, agenda_event_dto_1.UpdateAgendaEventDto]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, agenda_event_dto_1.ConfirmAgendaEventDto]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "confirm", null);
__decorate([
    (0, common_1.Delete)(':id/confirm/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "removeConfirmation", null);
exports.AgendaController = AgendaController = __decorate([
    (0, common_1.Controller)('agenda-events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCalendarEditPermissions)()),
    __metadata("design:paramtypes", [agenda_service_1.AgendaService])
], AgendaController);
//# sourceMappingURL=agenda.controller.js.map