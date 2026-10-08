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
exports.WhatsAppWebhookController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_1 = require("../../auth/decorators/public.decorator");
const whatsapp_service_1 = require("../application/whatsapp.service");
let WhatsAppWebhookController = class WhatsAppWebhookController {
    whatsAppService;
    constructor(whatsAppService) {
        this.whatsAppService = whatsAppService;
    }
    verifyWebhook(mode, token, challenge) {
        return this.whatsAppService.verifyWebhook(mode, token, challenge);
    }
    async handleWebhook(payload) {
        await this.whatsAppService.handleWebhook(payload && typeof payload === 'object'
            ? payload
            : {});
        return { status: 'EVENT_RECEIVED' };
    }
};
exports.WhatsAppWebhookController = WhatsAppWebhookController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", String)
], WhatsAppWebhookController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "handleWebhook", null);
exports.WhatsAppWebhookController = WhatsAppWebhookController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('whatsapp-webhook'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService])
], WhatsAppWebhookController);
//# sourceMappingURL=whatsapp-webhook.controller.js.map