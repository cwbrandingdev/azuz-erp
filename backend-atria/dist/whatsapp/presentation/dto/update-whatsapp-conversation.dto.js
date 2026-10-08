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
exports.UpdateWhatsAppConversationDto = void 0;
const class_validator_1 = require("class-validator");
const whatsapp_message_1 = require("../../domain/whatsapp-message");
class UpdateWhatsAppConversationDto {
    name;
    status;
    priority;
    assignedUserId;
    labels;
}
exports.UpdateWhatsAppConversationDto = UpdateWhatsAppConversationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateWhatsAppConversationDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(whatsapp_message_1.WhatsAppInboxStatus),
    __metadata("design:type", String)
], UpdateWhatsAppConversationDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(whatsapp_message_1.WhatsAppInboxPriority),
    __metadata("design:type", String)
], UpdateWhatsAppConversationDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null && value !== ''),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateWhatsAppConversationDto.prototype, "assignedUserId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateWhatsAppConversationDto.prototype, "labels", void 0);
//# sourceMappingURL=update-whatsapp-conversation.dto.js.map