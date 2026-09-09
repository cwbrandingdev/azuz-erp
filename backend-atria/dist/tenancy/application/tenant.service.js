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
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const tenant_constants_1 = require("../domain/tenant.constants");
const tenant_repository_port_1 = require("./ports/tenant-repository.port");
let TenantService = class TenantService {
    tenants;
    constructor(tenants) {
        this.tenants = tenants;
    }
    findById(id) {
        return this.tenants.findById(id);
    }
    findBySlug(slug) {
        return this.tenants.findBySlug(slug);
    }
    async ensureDefaultTenant() {
        const existing = await this.tenants.findBySlug(tenant_constants_1.DEFAULT_TENANT_SLUG);
        if (existing) {
            return existing;
        }
        const byId = await this.tenants.findById(tenant_constants_1.DEFAULT_TENANT_ID);
        if (byId) {
            return byId;
        }
        return this.tenants.create({
            id: tenant_constants_1.DEFAULT_TENANT_ID,
            name: tenant_constants_1.DEFAULT_TENANT_NAME,
            slug: tenant_constants_1.DEFAULT_TENANT_SLUG,
        });
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(tenant_repository_port_1.TENANT_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], TenantService);
//# sourceMappingURL=tenant.service.js.map