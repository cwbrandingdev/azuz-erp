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
exports.CreateJhonatanCalendarDto = exports.QueryJhonatanCalendarDto = void 0;
const class_validator_1 = require("class-validator");
class QueryJhonatanCalendarDto {
    from;
    to;
}
exports.QueryJhonatanCalendarDto = QueryJhonatanCalendarDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryJhonatanCalendarDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryJhonatanCalendarDto.prototype, "to", void 0);
class CreateJhonatanCalendarDto {
    startAt;
    title;
    leadId;
    contactName;
    briefing;
}
exports.CreateJhonatanCalendarDto = CreateJhonatanCalendarDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateJhonatanCalendarDto.prototype, "startAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateJhonatanCalendarDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateJhonatanCalendarDto.prototype, "leadId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateJhonatanCalendarDto.prototype, "contactName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateJhonatanCalendarDto.prototype, "briefing", void 0);
//# sourceMappingURL=jhonatan-calendar.dto.js.map