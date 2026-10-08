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
exports.WhatsAppController = void 0;
const common_1 = require("@nestjs/common");
const allow_authenticated_decorator_1 = require("../../auth/decorators/allow-authenticated.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const whatsapp_service_1 = require("../application/whatsapp.service");
const send_whatsapp_message_dto_1 = require("./dto/send-whatsapp-message.dto");
let WhatsAppController = class WhatsAppController {
    whatsAppService;
    constructor(whatsAppService) {
        this.whatsAppService = whatsAppService;
    }
    send(dto) {
        return this.whatsAppService.send(dto.to, dto.message);
    }
    listConversations() {
        return this.whatsAppService.listConversations();
    }
    listByPhone(phone) {
        return this.whatsAppService.listByPhone(phone);
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_whatsapp_message_dto_1.SendWhatsAppMessageDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "send", null);
__decorate([
    (0, common_1.Get)('conversations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)('messages/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listByPhone", null);
exports.WhatsAppController = WhatsAppController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map