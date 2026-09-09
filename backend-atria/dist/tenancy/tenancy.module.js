"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenancyModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tenant_repository_port_1 = require("./application/ports/tenant-repository.port");
const resolve_tenant_from_host_service_1 = require("./application/resolve-tenant-from-host.service");
const tenant_service_1 = require("./application/tenant.service");
const prisma_tenant_repository_1 = require("./infrastructure/prisma-tenant.repository");
const tenant_context_interceptor_1 = require("./presentation/tenant-context.interceptor");
const tenant_host_middleware_1 = require("./presentation/tenant-host.middleware");
const tenants_controller_1 = require("./presentation/tenants.controller");
let TenancyModule = class TenancyModule {
    configure(consumer) {
        consumer
            .apply(tenant_host_middleware_1.TenantHostMiddleware)
            .exclude({ path: 'tenants/:slug', method: common_1.RequestMethod.GET })
            .forRoutes('*');
    }
};
exports.TenancyModule = TenancyModule;
exports.TenancyModule = TenancyModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [tenants_controller_1.TenantsController],
        providers: [
            tenant_service_1.TenantService,
            resolve_tenant_from_host_service_1.ResolveTenantFromHostService,
            tenant_host_middleware_1.TenantHostMiddleware,
            {
                provide: tenant_repository_port_1.TENANT_REPOSITORY,
                useClass: prisma_tenant_repository_1.PrismaTenantRepository,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: tenant_context_interceptor_1.TenantContextInterceptor,
            },
        ],
        exports: [tenant_service_1.TenantService, tenant_repository_port_1.TENANT_REPOSITORY, resolve_tenant_from_host_service_1.ResolveTenantFromHostService],
    })
], TenancyModule);
//# sourceMappingURL=tenancy.module.js.map