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
exports.VoiceController = void 0;
const common_1 = require("@nestjs/common");
const any_permissions_decorator_1 = require("../auth/decorators/any-permissions.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const rbac_1 = require("../auth/utils/rbac");
const create_lead_call_dto_1 = require("./dto/create-lead-call.dto");
const list_lead_calls_query_1 = require("./dto/list-lead-calls.query");
const update_lead_call_dto_1 = require("./dto/update-lead-call.dto");
const voice_service_1 = require("./voice.service");
let VoiceController = class VoiceController {
    voiceService;
    constructor(voiceService) {
        this.voiceService = voiceService;
    }
    getConfig() {
        return this.voiceService.getPublicConfig();
    }
    createToken(user) {
        return this.voiceService.createAccessToken(user);
    }
    listCalls(user, query) {
        return this.voiceService.listCalls(user, query.leadId);
    }
    startCall(user, dto) {
        return this.voiceService.startCall(user, dto.leadId, dto.notes);
    }
    updateCall(user, id, dto) {
        return this.voiceService.updateCall(user, id, dto);
    }
};
exports.VoiceController = VoiceController;
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('token'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "createToken", null);
__decorate([
    (0, common_1.Get)('calls'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_lead_calls_query_1.ListLeadCallsQueryDto]),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "listCalls", null);
__decorate([
    (0, common_1.Post)('calls'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_lead_call_dto_1.CreateLeadCallDto]),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "startCall", null);
__decorate([
    (0, common_1.Patch)('calls/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_lead_call_dto_1.UpdateLeadCallDto]),
    __metadata("design:returntype", void 0)
], VoiceController.prototype, "updateCall", null);
exports.VoiceController = VoiceController = __decorate([
    (0, common_1.Controller)('voice'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, any_permissions_decorator_1.AnyPermissions)(...(0, rbac_1.getRequiredCrmPermissions)()),
    __metadata("design:paramtypes", [voice_service_1.VoiceService])
], VoiceController);
//# sourceMappingURL=voice.controller.js.map