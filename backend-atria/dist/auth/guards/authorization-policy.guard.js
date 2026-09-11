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
exports.AuthorizationPolicyGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const allow_authenticated_decorator_1 = require("../decorators/allow-authenticated.decorator");
const any_permissions_decorator_1 = require("../decorators/any-permissions.decorator");
const permissions_decorator_1 = require("../decorators/permissions.decorator");
const portal_authenticated_decorator_1 = require("../decorators/portal-authenticated.decorator");
const public_decorator_1 = require("../decorators/public.decorator");
const roles_decorator_1 = require("../decorators/roles.decorator");
let AuthorizationPolicyGuard = class AuthorizationPolicyGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        if (context.getType() !== 'http') {
            return true;
        }
        const targets = [context.getHandler(), context.getClass()];
        if (this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, targets)) {
            return true;
        }
        if (this.reflector.getAllAndOverride(allow_authenticated_decorator_1.ALLOW_AUTHENTICATED_KEY, targets)) {
            return true;
        }
        if (this.reflector.getAllAndOverride(portal_authenticated_decorator_1.PORTAL_AUTHENTICATED_KEY, targets)) {
            return true;
        }
        const roles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, targets);
        if (Array.isArray(roles) && roles.length > 0) {
            return true;
        }
        const permissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, targets);
        if (Array.isArray(permissions) && permissions.length > 0) {
            return true;
        }
        const anyPermissions = this.reflector.getAllAndOverride(any_permissions_decorator_1.ANY_PERMISSIONS_KEY, targets);
        if (Array.isArray(anyPermissions) && anyPermissions.length > 0) {
            return true;
        }
        throw new common_1.ForbiddenException('This endpoint is missing an authorization policy');
    }
};
exports.AuthorizationPolicyGuard = AuthorizationPolicyGuard;
exports.AuthorizationPolicyGuard = AuthorizationPolicyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], AuthorizationPolicyGuard);
//# sourceMappingURL=authorization-policy.guard.js.map