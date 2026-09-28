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
exports.QueryTasksDto = exports.BulkDeleteTaskAssetsDto = exports.UpdateTaskStatusDto = exports.MoveTaskDto = exports.UpdateTaskDto = exports.CreateTaskDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const entity_id_1 = require("../../common/validation/entity-id");
class CreateTaskDto {
    title;
    description;
    postCaption;
    columnId;
    contentType;
    priority;
    status;
    productionPhase;
    dueDate;
    publicationDate;
    deliveryDate;
    assigneeIds;
    assignedGroupId;
    clientId;
    contentPostId;
    calendarEventId;
    referenceUrl;
}
exports.CreateTaskDto = CreateTaskDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "postCaption", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "columnId", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskContentType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "contentType", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskPriority),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "priority", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "status", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.ProductionPhase),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "productionPhase", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "publicationDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, entity_id_1.IsEntityId)({ each: true }),
    __metadata("design:type", Array)
], CreateTaskDto.prototype, "assigneeIds", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "assignedGroupId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "clientId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "contentPostId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "calendarEventId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "referenceUrl", void 0);
class UpdateTaskDto {
    title;
    description;
    postCaption;
    columnId;
    contentType;
    priority;
    status;
    productionPhase;
    dueDate;
    publicationDate;
    deliveryDate;
    assigneeIds;
    assignedGroupId;
    order;
    clientId;
    referenceUrl;
}
exports.UpdateTaskDto = UpdateTaskDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "postCaption", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "columnId", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskContentType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "contentType", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskPriority),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "priority", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "status", void 0);
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.ProductionPhase),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "productionPhase", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_, value) => value !== undefined && value !== null),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "publicationDate", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((_, value) => value !== undefined && value !== null),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === null)
            return [];
        if (Array.isArray(value))
            return value;
        return undefined;
    }),
    (0, class_validator_1.IsArray)(),
    (0, entity_id_1.IsEntityId)({ each: true }),
    __metadata("design:type", Array)
], UpdateTaskDto.prototype, "assigneeIds", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "assignedGroupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateTaskDto.prototype, "order", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_protocol: true }),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "referenceUrl", void 0);
class MoveTaskDto {
    columnId;
    order;
}
exports.MoveTaskDto = MoveTaskDto;
__decorate([
    (0, entity_id_1.IsEntityId)(),
    __metadata("design:type", String)
], MoveTaskDto.prototype, "columnId", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], MoveTaskDto.prototype, "order", void 0);
class UpdateTaskStatusDto {
    status;
}
exports.UpdateTaskStatusDto = UpdateTaskStatusDto;
__decorate([
    (0, entity_id_1.ToUpperEnum)(),
    (0, class_validator_1.IsEnum)(client_1.KanbanTaskStatus),
    __metadata("design:type", String)
], UpdateTaskStatusDto.prototype, "status", void 0);
class BulkDeleteTaskAssetsDto {
    assetIds;
}
exports.BulkDeleteTaskAssetsDto = BulkDeleteTaskAssetsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, entity_id_1.IsEntityId)({ each: true }),
    __metadata("design:type", Array)
], BulkDeleteTaskAssetsDto.prototype, "assetIds", void 0);
class QueryTasksDto {
    columnId;
    clientId;
    organizationId;
    startDate;
    endDate;
}
exports.QueryTasksDto = QueryTasksDto;
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], QueryTasksDto.prototype, "columnId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], QueryTasksDto.prototype, "clientId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], QueryTasksDto.prototype, "organizationId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryTasksDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QueryTasksDto.prototype, "endDate", void 0);
//# sourceMappingURL=task.dto.js.map