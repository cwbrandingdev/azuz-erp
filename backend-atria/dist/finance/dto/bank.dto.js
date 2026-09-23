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
exports.IgnoreStatementLinesDto = exports.MatchStatementDto = exports.ImportOfxDto = exports.UpdateBankAccountDto = exports.CreateBankAccountDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateBankAccountDto {
    name;
    institution;
    initialBalance;
}
exports.CreateBankAccountDto = CreateBankAccountDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "institution", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], CreateBankAccountDto.prototype, "initialBalance", void 0);
class UpdateBankAccountDto {
    name;
    institution;
    initialBalance;
}
exports.UpdateBankAccountDto = UpdateBankAccountDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], UpdateBankAccountDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], UpdateBankAccountDto.prototype, "institution", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], UpdateBankAccountDto.prototype, "initialBalance", void 0);
class ImportOfxDto {
    content;
}
exports.ImportOfxDto = ImportOfxDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ImportOfxDto.prototype, "content", void 0);
class MatchStatementDto {
    statementLineId;
    transactionId;
}
exports.MatchStatementDto = MatchStatementDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MatchStatementDto.prototype, "statementLineId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MatchStatementDto.prototype, "transactionId", void 0);
class IgnoreStatementLinesDto {
    ids;
}
exports.IgnoreStatementLinesDto = IgnoreStatementLinesDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], IgnoreStatementLinesDto.prototype, "ids", void 0);
//# sourceMappingURL=bank.dto.js.map