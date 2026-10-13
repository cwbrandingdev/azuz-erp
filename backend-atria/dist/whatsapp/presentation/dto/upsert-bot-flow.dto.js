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
exports.UpsertBotFlowDto = exports.BotFlowDefinitionDto = exports.BotFlowNodeDto = exports.BotFlowOptionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class BotFlowOptionDto {
    key;
    label;
    nextId;
}
exports.BotFlowOptionDto = BotFlowOptionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BotFlowOptionDto.prototype, "key", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BotFlowOptionDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], BotFlowOptionDto.prototype, "nextId", void 0);
class BotFlowNodeDto {
    id;
    type;
    text;
    field;
    options;
    nextId;
}
exports.BotFlowNodeDto = BotFlowNodeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BotFlowNodeDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['message', 'menu', 'question', 'ai', 'handoff']),
    __metadata("design:type", String)
], BotFlowNodeDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BotFlowNodeDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BotFlowNodeDto.prototype, "field", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BotFlowOptionDto),
    __metadata("design:type", Array)
], BotFlowNodeDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], BotFlowNodeDto.prototype, "nextId", void 0);
class BotFlowDefinitionDto {
    startId;
    nodes;
}
exports.BotFlowDefinitionDto = BotFlowDefinitionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BotFlowDefinitionDto.prototype, "startId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BotFlowNodeDto),
    __metadata("design:type", Array)
], BotFlowDefinitionDto.prototype, "nodes", void 0);
class UpsertBotFlowDto {
    name;
    enabled;
    definition;
}
exports.UpsertBotFlowDto = UpsertBotFlowDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpsertBotFlowDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpsertBotFlowDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => BotFlowDefinitionDto),
    __metadata("design:type", BotFlowDefinitionDto)
], UpsertBotFlowDto.prototype, "definition", void 0);
//# sourceMappingURL=upsert-bot-flow.dto.js.map