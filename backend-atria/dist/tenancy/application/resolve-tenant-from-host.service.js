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
exports.ResolveTenantFromHostService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tenant_host_1 = require("../domain/tenant-host");
const tenant_service_1 = require("./tenant.service");
let ResolveTenantFromHostService = class ResolveTenantFromHostService {
    configService;
    tenants;
    constructor(configService, tenants) {
        this.configService = configService;
        this.tenants = tenants;
    }
    resolveSlug(headers) {
        return ((0, tenant_host_1.readExplicitTenantSlug)(headers) ??
            (0, tenant_host_1.extractTenantSlug)((0, tenant_host_1.readHostHeader)(headers), this.baseDomains()));
    }
    async resolve(headers) {
        const slug = this.resolveSlug(headers);
        if (!slug) {
            return { kind: 'none' };
        }
        const tenant = await this.tenants.findBySlug(slug);
        if (!tenant) {
            return { kind: 'unknown', slug };
        }
        return { kind: 'found', tenant };
    }
    async resolveOrThrow(headers) {
        const resolution = await this.resolve(headers);
        if (resolution.kind === 'none') {
            return undefined;
        }
        if (resolution.kind === 'unknown') {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return resolution.tenant;
    }
    baseDomains() {
        return (0, tenant_host_1.parseBaseDomains)(this.configService.get('TENANT_BASE_DOMAINS') ?? '');
    }
};
exports.ResolveTenantFromHostService = ResolveTenantFromHostService;
exports.ResolveTenantFromHostService = ResolveTenantFromHostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        tenant_service_1.TenantService])
], ResolveTenantFromHostService);
//# sourceMappingURL=resolve-tenant-from-host.service.js.map