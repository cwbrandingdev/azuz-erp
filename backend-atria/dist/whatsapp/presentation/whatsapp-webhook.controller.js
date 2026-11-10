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
const crypto_1 = require("crypto");
const public_decorator_1 = require("../../auth/decorators/public.decorator");
const whatsapp_service_1 = require("../application/whatsapp.service");
const whatsapp_config_1 = require("../infrastructure/whatsapp.config");
let WhatsAppWebhookController = class WhatsAppWebhookController {
    whatsAppService;
    config;
    constructor(whatsAppService, config) {
        this.whatsAppService = whatsAppService;
        this.config = config;
    }
    async handleWebhook(request, payload) {
        this.assertSignature(request.rawBody, request.header('x-webhook-hmac'));
        await this.whatsAppService.handleWebhook(payload);
        return { status: 'EVENT_RECEIVED' };
    }
    assertSignature(rawBody, header) {
        const key = this.config.webhookHmacKey;
        if (!key)
            return;
        const provided = header?.trim().replace(/^sha512=/i, '') ?? '';
        if (!rawBody || !provided) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const expected = (0, crypto_1.createHmac)('sha512', key).update(rawBody).digest('hex');
        const left = Buffer.from(expected);
        const right = Buffer.from(provided);
        if (left.length !== right.length || !(0, crypto_1.timingSafeEqual)(left, right)) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
    }
};
exports.WhatsAppWebhookController = WhatsAppWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "handleWebhook", null);
exports.WhatsAppWebhookController = WhatsAppWebhookController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('whatsapp-webhook'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService,
        whatsapp_config_1.WhatsAppConfig])
], WhatsAppWebhookController);
//# sourceMappingURL=whatsapp-webhook.controller.js.map