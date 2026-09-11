"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const authorization_policy_guard_1 = require("./guards/authorization-policy.guard");
const permissions_guard_1 = require("./guards/permissions.guard");
const roles_guard_1 = require("./guards/roles.guard");
const client_access_interceptor_1 = require("./interceptors/client-access.interceptor");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.getOrThrow('JWT_ACCESS_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
                    },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            roles_guard_1.RolesGuard,
            permissions_guard_1.PermissionsGuard,
            authorization_policy_guard_1.AuthorizationPolicyGuard,
            client_access_interceptor_1.ClientAccessInterceptor,
            {
                provide: core_1.APP_GUARD,
                useClass: authorization_policy_guard_1.AuthorizationPolicyGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: client_access_interceptor_1.ClientAccessInterceptor,
            },
        ],
        exports: [auth_service_1.AuthService, jwt_1.JwtModule, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map