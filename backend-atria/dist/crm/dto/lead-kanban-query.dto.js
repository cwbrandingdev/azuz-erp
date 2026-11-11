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
exports.LeadKanbanColumnQueryDto = exports.LeadKanbanQueryDto = exports.KANBAN_SEARCH_MAX_LENGTH = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const query_param_1 = require("../../common/validation/query-param");
const prospecting_leads_query_dto_1 = require("./prospecting-leads-query.dto");
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
exports.KANBAN_SEARCH_MAX_LENGTH = 200;
class LeadKanbanQueryDto extends prospecting_leads_query_dto_1.ProspectingLeadsQueryDto {
    search;
    category;
    startDate;
    endDate;
}
exports.LeadKanbanQueryDto = LeadKanbanQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => (0, query_param_1.firstQueryValue)(value)),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(exports.KANBAN_SEARCH_MAX_LENGTH),
    __metadata("design:type", String)
], LeadKanbanQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => (0, query_param_1.firstQueryValue)(value)),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(exports.KANBAN_SEARCH_MAX_LENGTH),
    __metadata("design:type", String)
], LeadKanbanQueryDto.prototype, "category", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => (0, query_param_1.firstQueryValue)(value)),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(DATE_KEY),
    __metadata("design:type", String)
], LeadKanbanQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => (0, query_param_1.firstQueryValue)(value)),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(DATE_KEY),
    __metadata("design:type", String)
], LeadKanbanQueryDto.prototype, "endDate", void 0);
class LeadKanbanColumnQueryDto extends LeadKanbanQueryDto {
    offset;
}
exports.LeadKanbanColumnQueryDto = LeadKanbanColumnQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], LeadKanbanColumnQueryDto.prototype, "offset", void 0);
//# sourceMappingURL=lead-kanban-query.dto.js.map