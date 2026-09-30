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
exports.MetaOAuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const roles_1 = require("../../auth/constants/roles");
const public_decorator_1 = require("../../auth/decorators/public.decorator");
const meta_oauth_service_1 = require("./meta-oauth.service");
let MetaOAuthController = class MetaOAuthController {
    metaOAuth;
    constructor(metaOAuth) {
        this.metaOAuth = metaOAuth;
    }
    getConfig() {
        return {
            configured: this.metaOAuth.isConfigured(),
            scopes: this.metaOAuth.getRequiredScopes(),
        };
    }
    async authorize(clientId) {
        const url = await this.metaOAuth.buildAuthorizationUrl(clientId);
        return { url };
    }
    async callback(code, state, error, errorDescription, res) {
        if (error) {
            return res.redirect(this.metaOAuth.buildFrontendErrorRedirect(errorDescription || error || 'Autorização cancelada'));
        }
        try {
            const result = await this.metaOAuth.completeAuthorization(code, state);
            return res.redirect(this.metaOAuth.buildFrontendSuccessRedirect(result.clientId));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Falha na conexão com o Meta';
            return res.redirect(this.metaOAuth.buildFrontendErrorRedirect(message));
        }
    }
};
exports.MetaOAuthController = MetaOAuthController;
__decorate([
    (0, common_1.Get)('config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_VIEW_AND_CREATE_ROLES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetaOAuthController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('authorize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_VIEW_AND_CREATE_ROLES),
    __param(0, (0, common_1.Query)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MetaOAuthController.prototype, "authorize", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Query)('error_description')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MetaOAuthController.prototype, "callback", null);
exports.MetaOAuthController = MetaOAuthController = __decorate([
    (0, common_1.Controller)('integrations/meta/oauth'),
    __metadata("design:paramtypes", [meta_oauth_service_1.MetaOAuthService])
], MetaOAuthController);
//# sourceMappingURL=meta-oauth.controller.js.map