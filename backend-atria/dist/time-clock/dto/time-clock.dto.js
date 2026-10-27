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
exports.UpdateTimeClockEntryDto = exports.CreateManualTimeClockEntryDto = exports.TimeClockListQueryDto = exports.TimeClockRangeQueryDto = exports.PunchTimeClockDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const entity_id_1 = require("../../common/validation/entity-id");
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
class PunchTimeClockDto {
    type;
}
exports.PunchTimeClockDto = PunchTimeClockDto;
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.TimeClockEntryType),
    __metadata("design:type", String)
], PunchTimeClockDto.prototype, "type", void 0);
class TimeClockRangeQueryDto {
    from;
    to;
}
exports.TimeClockRangeQueryDto = TimeClockRangeQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(DAY_KEY_PATTERN, { message: 'from must be YYYY-MM-DD' }),
    __metadata("design:type", String)
], TimeClockRangeQueryDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(DAY_KEY_PATTERN, { message: 'to must be YYYY-MM-DD' }),
    __metadata("design:type", String)
], TimeClockRangeQueryDto.prototype, "to", void 0);
class TimeClockListQueryDto extends TimeClockRangeQueryDto {
    userId;
}
exports.TimeClockListQueryDto = TimeClockListQueryDto;
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], TimeClockListQueryDto.prototype, "userId", void 0);
class CreateManualTimeClockEntryDto {
    userId;
    type;
    punchedAt;
    note;
}
exports.CreateManualTimeClockEntryDto = CreateManualTimeClockEntryDto;
__decorate([
    (0, entity_id_1.IsEntityId)(),
    __metadata("design:type", String)
], CreateManualTimeClockEntryDto.prototype, "userId", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.TimeClockEntryType),
    __metadata("design:type", String)
], CreateManualTimeClockEntryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateManualTimeClockEntryDto.prototype, "punchedAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateManualTimeClockEntryDto.prototype, "note", void 0);
class UpdateTimeClockEntryDto {
    type;
    punchedAt;
    note;
}
exports.UpdateTimeClockEntryDto = UpdateTimeClockEntryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.TimeClockEntryType),
    __metadata("design:type", String)
], UpdateTimeClockEntryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateTimeClockEntryDto.prototype, "punchedAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateTimeClockEntryDto.prototype, "note", void 0);
//# sourceMappingURL=time-clock.dto.js.map