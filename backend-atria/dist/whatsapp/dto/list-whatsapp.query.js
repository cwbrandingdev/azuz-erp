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
exports.ListWhatsappMessagesQueryDto = exports.ListWhatsappConversationsQueryDto = void 0;
const class_validator_1 = require("class-validator");
const entity_id_1 = require("../../common/validation/entity-id");
class ListWhatsappConversationsQueryDto {
    leadId;
    clientId;
}
exports.ListWhatsappConversationsQueryDto = ListWhatsappConversationsQueryDto;
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], ListWhatsappConversationsQueryDto.prototype, "leadId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], ListWhatsappConversationsQueryDto.prototype, "clientId", void 0);
class ListWhatsappMessagesQueryDto {
    cursor;
}
exports.ListWhatsappMessagesQueryDto = ListWhatsappMessagesQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListWhatsappMessagesQueryDto.prototype, "cursor", void 0);
//# sourceMappingURL=list-whatsapp.query.js.map