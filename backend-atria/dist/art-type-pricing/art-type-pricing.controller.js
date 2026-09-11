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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtTypePricingController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const art_type_pricing_service_1 = require("./art-type-pricing.service");
const art_type_pricing_dto_1 = require("./dto/art-type-pricing.dto");
let ArtTypePricingController = class ArtTypePricingController {
    artTypePricingService;
    constructor(artTypePricingService) {
        this.artTypePricingService = artTypePricingService;
    }
    findAll() {
        return this.artTypePricingService.findAll();
    }
    findOne(id) {
        return this.artTypePricingService.findOne(id);
    }
    create(dto) {
        return this.artTypePricingService.create(dto);
    }
    update(id, dto) {
        return this.artTypePricingService.update(id, dto);
    }
    remove(id) {
        return this.artTypePricingService.remove(id);
    }
};
exports.ArtTypePricingController = ArtTypePricingController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ArtTypePricingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArtTypePricingController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [art_type_pricing_dto_1.CreateArtTypePricingDto]),
    __metadata("design:returntype", void 0)
], ArtTypePricingController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, art_type_pricing_dto_1.UpdateArtTypePricingDto]),
    __metadata("design:returntype", void 0)
], ArtTypePricingController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArtTypePricingController.prototype, "remove", null);
exports.ArtTypePricingController = ArtTypePricingController = __decorate([
    (0, common_1.Controller)('art-type-pricing'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.FINANCE_ACCESS),
    __metadata("design:paramtypes", [art_type_pricing_service_1.ArtTypePricingService])
], ArtTypePricingController);
//# sourceMappingURL=art-type-pricing.controller.js.map