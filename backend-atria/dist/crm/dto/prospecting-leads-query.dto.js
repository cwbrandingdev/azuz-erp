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
exports.ProspectingLeadsQueryDto = void 0;
const entity_id_1 = require("../../common/validation/entity-id");
class ProspectingLeadsQueryDto {
    organizationId;
    ownerUserId;
}
exports.ProspectingLeadsQueryDto = ProspectingLeadsQueryDto;
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], ProspectingLeadsQueryDto.prototype, "organizationId", void 0);
__decorate([
    (0, entity_id_1.IsEntityId)({ optional: true }),
    __metadata("design:type", String)
], ProspectingLeadsQueryDto.prototype, "ownerUserId", void 0);
//# sourceMappingURL=prospecting-leads-query.dto.js.map