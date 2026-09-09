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
exports.TenantHostMiddleware = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_1 = require("../domain/tenant-context");
const resolve_tenant_from_host_service_1 = require("../application/resolve-tenant-from-host.service");
let TenantHostMiddleware = class TenantHostMiddleware {
    resolveTenantFromHost;
    constructor(resolveTenantFromHost) {
        this.resolveTenantFromHost = resolveTenantFromHost;
    }
    async use(req, _res, next) {
        const tenant = await this.resolveTenantFromHost.resolveOrThrow(req.headers);
        if (!tenant) {
            next();
            return;
        }
        req.tenantId = tenant.id;
        req.tenantSlug = tenant.slug;
        (0, tenant_context_1.runWithTenant)(tenant.id, () => next());
    }
};
exports.TenantHostMiddleware = TenantHostMiddleware;
exports.TenantHostMiddleware = TenantHostMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resolve_tenant_from_host_service_1.ResolveTenantFromHostService])
], TenantHostMiddleware);
//# sourceMappingURL=tenant-host.middleware.js.map