"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappWebhookModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const whatsapp_webhook_controller_1 = require("./whatsapp-webhook.controller");
const whatsapp_webhook_service_1 = require("./whatsapp-webhook.service");
let WhatsappWebhookModule = class WhatsappWebhookModule {
};
exports.WhatsappWebhookModule = WhatsappWebhookModule;
exports.WhatsappWebhookModule = WhatsappWebhookModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [whatsapp_webhook_controller_1.WhatsappWebhookController],
        providers: [whatsapp_webhook_service_1.WhatsappWebhookService],
        exports: [whatsapp_webhook_service_1.WhatsappWebhookService],
    })
], WhatsappWebhookModule);
//# sourceMappingURL=whatsapp-webhook.module.js.map