"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModule = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const whatsapp_calling_service_1 = require("./application/whatsapp-calling.service");
const whatsapp_service_1 = require("./application/whatsapp.service");
const whatsapp_graph_gateway_1 = require("./domain/whatsapp-graph.gateway");
const whatsapp_message_repository_1 = require("./domain/whatsapp-message.repository");
const meta_whatsapp_graph_client_1 = require("./infrastructure/meta-whatsapp-graph.client");
const prisma_whatsapp_message_repository_1 = require("./infrastructure/prisma-whatsapp-message.repository");
const whatsapp_config_1 = require("./infrastructure/whatsapp.config");
const whatsapp_controller_1 = require("./presentation/whatsapp.controller");
const whatsapp_webhook_controller_1 = require("./presentation/whatsapp-webhook.controller");
let WhatsAppModule = class WhatsAppModule {
};
exports.WhatsAppModule = WhatsAppModule;
exports.WhatsAppModule = WhatsAppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 15_000,
                maxRedirects: 0,
            }),
        ],
        controllers: [whatsapp_webhook_controller_1.WhatsAppWebhookController, whatsapp_controller_1.WhatsAppController],
        providers: [
            whatsapp_config_1.WhatsAppConfig,
            whatsapp_service_1.WhatsAppService,
            whatsapp_calling_service_1.WhatsAppCallingService,
            {
                provide: whatsapp_message_repository_1.WhatsAppMessageRepository,
                useClass: prisma_whatsapp_message_repository_1.PrismaWhatsAppMessageRepository,
            },
            {
                provide: whatsapp_graph_gateway_1.WhatsAppGraphGateway,
                useClass: meta_whatsapp_graph_client_1.MetaWhatsAppGraphClient,
            },
        ],
        exports: [whatsapp_service_1.WhatsAppService, whatsapp_calling_service_1.WhatsAppCallingService],
    })
], WhatsAppModule);
//# sourceMappingURL=whatsapp.module.js.map