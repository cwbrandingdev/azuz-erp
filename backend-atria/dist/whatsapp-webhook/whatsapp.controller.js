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
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const allow_authenticated_decorator_1 = require("../auth/decorators/allow-authenticated.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const company_constants_1 = require("../company/company.constants");
const create_whatsapp_conversation_dto_1 = require("./dto/create-whatsapp-conversation.dto");
const send_whatsapp_message_dto_1 = require("./dto/send-whatsapp-message.dto");
const whatsapp_webhook_service_1 = require("./whatsapp-webhook.service");
let WhatsappController = class WhatsappController {
    webhookService;
    constructor(webhookService) {
        this.webhookService = webhookService;
    }
    listConversations(user) {
        return this.webhookService.listConversations(this.companyId(user));
    }
    createConversation(user, dto) {
        return this.webhookService.createConversation(this.companyId(user), dto.phone, dto.name);
    }
    listMessages(user, id) {
        return this.webhookService.listMessages(this.companyId(user), id);
    }
    send(user, dto) {
        return this.webhookService.sendText(this.companyId(user), user.userId, dto.to, dto.body);
    }
    companyId(user) {
        return user.companyId ?? company_constants_1.DEFAULT_COMPANY_ID;
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Post)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_whatsapp_conversation_dto_1.CreateWhatsappConversationDto]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "listMessages", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_whatsapp_message_dto_1.SendWhatsappMessageDto]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "send", null);
exports.WhatsappController = WhatsappController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    __metadata("design:paramtypes", [whatsapp_webhook_service_1.WhatsappWebhookService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map