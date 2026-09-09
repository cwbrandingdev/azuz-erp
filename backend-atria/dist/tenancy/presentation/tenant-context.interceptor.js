"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const tenant_context_1 = require("../domain/tenant-context");
let TenantContextInterceptor = class TenantContextInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const activeTenantId = (0, tenant_context_1.getCurrentTenantId)();
        const hostTenantId = activeTenantId ?? request.tenantId;
        const jwtTenantId = request.user?.tenantId ?? undefined;
        if (hostTenantId && jwtTenantId && hostTenantId !== jwtTenantId) {
            throw new common_1.ForbiddenException('Tenant mismatch');
        }
        const tenantId = hostTenantId ?? jwtTenantId;
        if (!tenantId) {
            return next.handle();
        }
        if (activeTenantId) {
            return next.handle();
        }
        return new rxjs_1.Observable((subscriber) => {
            const subscription = (0, tenant_context_1.runWithTenant)(tenantId, () => next.handle().subscribe({
                next: (value) => subscriber.next(value),
                error: (error) => subscriber.error(error),
                complete: () => subscriber.complete(),
            }));
            return () => subscription.unsubscribe();
        });
    }
};
exports.TenantContextInterceptor = TenantContextInterceptor;
exports.TenantContextInterceptor = TenantContextInterceptor = __decorate([
    (0, common_1.Injectable)()
], TenantContextInterceptor);
//# sourceMappingURL=tenant-context.interceptor.js.map