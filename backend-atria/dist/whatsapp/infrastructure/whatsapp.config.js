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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppConfig = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WhatsAppConfig = class WhatsAppConfig {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    get phoneNumberId() {
        return (this.configService.get('WHATSAPP_PHONE_NUMBER_ID')?.trim() ?? '');
    }
    get permanentToken() {
        return (this.configService.get('WHATSAPP_PERMANENT_TOKEN')?.trim() ||
            this.configService.get('WHATSAPP_ACCESS_TOKEN')?.trim() ||
            '');
    }
    get verifyToken() {
        return (this.configService.get('WEBHOOK_VERIFY_TOKEN')?.trim() ?? '');
    }
    get graphVersion() {
        return 'v23.0';
    }
    get isConfigured() {
        return Boolean(this.phoneNumberId && this.permanentToken);
    }
};
exports.WhatsAppConfig = WhatsAppConfig;
exports.WhatsAppConfig = WhatsAppConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsAppConfig);
//# sourceMappingURL=whatsapp.config.js.map