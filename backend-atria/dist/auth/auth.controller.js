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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const change_password_dto_1 = require("./dto/change-password.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const register_dto_1 = require("./dto/register.dto");
const create_invitation_token_dto_1 = require("./dto/create-invitation-token.dto");
const signup_with_token_dto_1 = require("./dto/signup-with-token.dto");
const validate_invitation_token_dto_1 = require("./dto/validate-invitation-token.dto");
const client_1 = require("@prisma/client");
const throttler_1 = require("@nestjs/throttler");
const permissions_1 = require("./constants/permissions");
const throttle_1 = require("./constants/throttle");
const allow_authenticated_decorator_1 = require("./decorators/allow-authenticated.decorator");
const permissions_decorator_1 = require("./decorators/permissions.decorator");
const public_decorator_1 = require("./decorators/public.decorator");
const roles_decorator_1 = require("./decorators/roles.decorator");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const permissions_guard_1 = require("./guards/permissions.guard");
const roles_guard_1 = require("./guards/roles.guard");
const REFRESH_TOKEN_COOKIE = 'atria_refresh_token';
let AuthController = class AuthController {
    authService;
    configService;
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    async signupWithToken(dto, res) {
        const result = await this.authService.signupWithToken(dto);
        this.setRefreshTokenCookie(res, result.refreshToken);
        return {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }
    validateInvitationToken(dto) {
        return this.authService.validateInvitationToken(dto.token);
    }
    createInvitationToken(user, dto) {
        return this.authService.createInvitationToken(user.userId, dto);
    }
    register(dto) {
        return this.authService.register(dto);
    }
    async login(dto, res) {
        const result = await this.authService.login(dto);
        this.setRefreshTokenCookie(res, result.refreshToken);
        return {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }
    async refresh(req, dto, res) {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? dto?.refreshToken;
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Refresh token required');
        }
        const result = await this.authService.refresh(refreshToken);
        this.setRefreshTokenCookie(res, result.refreshToken);
        return {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }
    async logout(req, dto, res) {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? dto?.refreshToken;
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }
        this.clearRefreshTokenCookie(res);
    }
    getProfile(user) {
        return this.authService.getProfile(user.userId);
    }
    changePassword(user, dto) {
        return this.authService.changePassword(user.userId, dto);
    }
    getRefreshCookieOptions() {
        const isProduction = process.env.NODE_ENV === 'production';
        const domain = this.configService.get('COOKIE_DOMAIN')?.trim();
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: (isProduction ? 'none' : 'lax'),
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            ...(domain ? { domain } : {}),
        };
    }
    setRefreshTokenCookie(res, refreshToken) {
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, this.getRefreshCookieOptions());
    }
    clearRefreshTokenCookie(res) {
        res.clearCookie(REFRESH_TOKEN_COOKIE, this.getRefreshCookieOptions());
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('signup-with-token'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_with_token_dto_1.SignupWithTokenDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signupWithToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('invitation-tokens/validate'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [validate_invitation_token_dto_1.ValidateInvitationTokenDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "validateInvitationToken", null);
__decorate([
    (0, common_1.Post)('invitation-tokens'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.MASTER, client_1.RoleName.ADMIN),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.INVITATIONS_MANAGE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_invitation_token_dto_1.CreateInvitationTokenDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "createInvitationToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.GONE),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)(throttle_1.AUTH_THROTTLE),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)(throttle_1.AUTH_THROTTLE),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, refresh_token_dto_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, refresh_token_dto_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map