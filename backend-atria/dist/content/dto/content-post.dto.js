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
exports.QueryContentPostsDto = exports.UpdateContentPostDto = exports.CreateContentPostDto = exports.AttachmentDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const class_validator_2 = require("class-validator");
const client_1 = require("@prisma/client");
const entity_id_1 = require("../../common/validation/entity-id");
class AttachmentDto {
    name;
    url;
    mimeType;
}
exports.AttachmentDto = AttachmentDto;
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsNotEmpty)(),
    (0, class_validator_2.MaxLength)(255),
    __metadata("design:type", String)
], AttachmentDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsNotEmpty)(),
    (0, class_validator_2.MaxLength)(2000),
    __metadata("design:type", String)
], AttachmentDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.MaxLength)(100),
    __metadata("design:type", String)
], AttachmentDto.prototype, "mimeType", void 0);
class CreateContentPostDto {
    title;
    clientId;
    platform;
    format;
    scheduledDate;
    status;
    copy;
    referenceUrl;
    assigneeId;
    attachments;
    publishToInstagram;
}
exports.CreateContentPostDto = CreateContentPostDto;
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsNotEmpty)(),
    (0, class_validator_2.MaxLength)(255),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "title", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)(),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "clientId", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPlatform),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "platform", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPostFormat),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "format", void 0);
__decorate([
    (0, class_validator_2.IsDateString)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "scheduledDate", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPostStatus),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "copy", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    (0, class_validator_2.MaxLength)(2048),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "referenceUrl", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], CreateContentPostDto.prototype, "assigneeId", void 0);
__decorate([
    (0, class_validator_2.IsArray)(),
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AttachmentDto),
    __metadata("design:type", Array)
], CreateContentPostDto.prototype, "attachments", void 0);
__decorate([
    (0, class_validator_2.IsBoolean)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateContentPostDto.prototype, "publishToInstagram", void 0);
class UpdateContentPostDto {
    title;
    clientId;
    platform;
    format;
    scheduledDate;
    status;
    copy;
    referenceUrl;
    assigneeId;
    attachments;
    publishToInstagram;
}
exports.UpdateContentPostDto = UpdateContentPostDto;
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.MaxLength)(255),
    __metadata("design:type", String)
], UpdateContentPostDto.prototype, "title", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], UpdateContentPostDto.prototype, "clientId", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPlatform),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], UpdateContentPostDto.prototype, "platform", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPostFormat),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], UpdateContentPostDto.prototype, "format", void 0);
__decorate([
    (0, class_validator_2.IsDateString)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", Object)
], UpdateContentPostDto.prototype, "scheduledDate", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPostStatus),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], UpdateContentPostDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_2.IsString)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], UpdateContentPostDto.prototype, "copy", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    (0, class_validator_2.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateContentPostDto.prototype, "referenceUrl", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", Object)
], UpdateContentPostDto.prototype, "assigneeId", void 0);
__decorate([
    (0, class_validator_2.IsArray)(),
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AttachmentDto),
    __metadata("design:type", Array)
], UpdateContentPostDto.prototype, "attachments", void 0);
__decorate([
    (0, class_validator_2.IsBoolean)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateContentPostDto.prototype, "publishToInstagram", void 0);
class QueryContentPostsDto {
    clientId;
    platform;
    status;
    from;
    to;
}
exports.QueryContentPostsDto = QueryContentPostsDto;
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], QueryContentPostsDto.prototype, "clientId", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPlatform),
    __metadata("design:type", String)
], QueryContentPostsDto.prototype, "platform", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsEnum)(client_1.ContentPostStatus),
    __metadata("design:type", String)
], QueryContentPostsDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_2.IsDateString)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], QueryContentPostsDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_2.IsDateString)(),
    (0, class_validator_2.IsOptional)(),
    __metadata("design:type", String)
], QueryContentPostsDto.prototype, "to", void 0);
//# sourceMappingURL=content-post.dto.js.map