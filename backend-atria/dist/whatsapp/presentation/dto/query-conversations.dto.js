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
exports.QueryConversationsDto = void 0;
const class_validator_1 = require("class-validator");
const whatsapp_message_1 = require("../../domain/whatsapp-message");
class QueryConversationsDto {
    status;
    assignee;
    q;
}
exports.QueryConversationsDto = QueryConversationsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(whatsapp_message_1.WhatsAppInboxStatus),
    __metadata("design:type", String)
], QueryConversationsDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['mine', 'unassigned', 'all']),
    __metadata("design:type", String)
], QueryConversationsDto.prototype, "assignee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryConversationsDto.prototype, "q", void 0);
//# sourceMappingURL=query-conversations.dto.js.map